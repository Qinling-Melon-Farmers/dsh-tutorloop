import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createActionRoute, createWorkspaceTrust } from '../src/server.js'

test('student HTTP API trusts host workspaces, rejects teacher actions and enforces browser origin', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'tutorloop-http-'))
  const calls = []
  const trust = createWorkspaceTrust({ trustStore: join(workspace, 'isolated-trust.json') })
  const route = createActionRoute(async (...args) => { calls.push(args); return { student: true } }, trust, { maxRequestBytes: 1024 })
  const server = createServer(route.handler)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}`
  const post = (body, headers = {}) => fetch(base, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) })
  try {
    assert.equal((await post({ action: 'overview', cwd: workspace })).status, 403)
    trust.touch(workspace)
    const good = await post({ action: 'student_state', cwd: workspace, payload: {} }, { origin: base })
    assert.equal(good.status, 200)
    assert.deepEqual(await good.json(), { ok: true, data: { student: true } })
    assert.equal(calls[0][3].cwd, workspace)
    assert.equal((await post({ action: 'get_context', cwd: workspace })).status, 403)
    assert.equal((await post({ action: 'apply_feedback', cwd: workspace })).status, 403)
    assert.equal((await post({ action: 'create_practice', cwd: workspace })).status, 403)
    assert.equal((await post({ action: 'overview', cwd: workspace }, { origin: 'https://untrusted.example' })).status, 403)
    assert.equal((await post({ action: 'overview', cwd: workspace }, { 'sec-fetch-site': 'cross-site' })).status, 403)
    assert.equal((await post({ action: 'overview', cwd: workspace }, { 'content-type': 'text/plain' })).status, 415)
    assert.equal((await post('{broken')).status, 400)
    assert.equal((await post({ action: 'overview', cwd: workspace, payload: [] })).status, 400)
    assert.equal((await post('x'.repeat(2048))).status, 413)
    assert.equal((await fetch(base)).status, 405)
    writeFileSync(join(workspace, 'lesson.txt'), '教学材料')
    assert.equal((await post({ action: 'import_file', cwd: workspace, payload: { path: 'lesson.txt' } })).status, 200)
    // Windows runners may expose TEMP through an 8.3 alias (RUNNER~1).
    // Imports intentionally resolve it to the actual path before validation.
    assert.equal(calls.at(-1)[1].path, await realpath(join(workspace, 'lesson.txt')))
    assert.equal((await post({ action: 'import_folder', cwd: workspace, payload: { path: '..' } })).status, 403)
    writeFileSync(join(workspace, 'private.env'), 'never read this fixture')
    assert.equal((await post({ action: 'import_file', cwd: workspace, payload: { path: 'private.env' } })).status, 400)
    // 重启模拟:同一 store 的新 trust 实例自动恢复已确认工作区,面板不再重锁。
    const rebooted = createWorkspaceTrust({ trustStore: join(workspace, 'isolated-trust.json') })
    assert.ok(rebooted.allows(workspace))
    assert.ok(!rebooted.allows(join(workspace, 'not-touched')))
  } finally {
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
    rmSync(workspace, { recursive: true, force: true })
  }
})
