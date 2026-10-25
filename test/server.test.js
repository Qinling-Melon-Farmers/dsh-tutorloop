import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { mkdtempSync, writeFileSync, rmSync, readdirSync, symlinkSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createActionRoute, createWorkspaceTrust, PUBLIC_ACTIONS } from '../src/server.js'
import { ACTIONS } from '../src/bridge-client.js'
import { STUDENT_ACTIONS as CLIENT_ACTIONS } from '../src/client/api.js'

test('student actions are all bridge-supported and teacher actions stay private', () => {
  for (const action of PUBLIC_ACTIONS) assert.ok(ACTIONS.has(action), action)
  for (const action of CLIENT_ACTIONS) assert.ok(PUBLIC_ACTIONS.has(action), action)
  for (const action of ['get_context', 'apply_feedback', 'create_practice', 'prepare_rubric', 'find_materials']) {
    assert.ok(ACTIONS.has(action))
    assert.ok(!PUBLIC_ACTIONS.has(action))
  }
})

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
    assert.equal((await post({ action: 'prepare_rubric', cwd: workspace })).status, 403)
    assert.equal((await post({ action: 'find_materials', cwd: workspace, payload: { query: 'answer' } })).status, 403)
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

test('independent hosts preserve concurrent confirmations and legacy BOM grants', async () => {
  const root = mkdtempSync(join(tmpdir(), 'tutorloop-trust-'))
  const trustStore = join(root, 'trusted.json')
  const firstPath = join(root, '中文工作区')
  const secondPath = join(root, 'second')
  try {
    writeFileSync(trustStore, '\uFEFF' + JSON.stringify({ workspaces: [firstPath, 'relative-not-trusted', 123] }))
    const first = createWorkspaceTrust({ trustStore })
    const second = createWorkspaceTrust({ trustStore })
    assert.ok(first.allows(firstPath))
    if (process.platform === 'win32') {
      assert.ok(first.allows(firstPath.toUpperCase().replaceAll('\\', '/') + '/.'))
      assert.ok(first.allows('\\\\?\\' + firstPath))
    }
    first.touch(secondPath)
    second.touch(join(root, 'third'))
    assert.ok(createWorkspaceTrust({ trustStore }).allows(secondPath))
    const moduleUrl = pathToFileURL(resolve('src/server.js')).href
    const children = Array.from({ length: 8 }, (_, i) => {
      const workspace = join(root, `child-${i}`)
      const script = `import {createWorkspaceTrust} from ${JSON.stringify(moduleUrl)}; const trust=createWorkspaceTrust({trustStore:${JSON.stringify(trustStore)}}); process.send('ready'); process.once('message',()=>{trust.touch(${JSON.stringify(workspace)});process.disconnect()});`
      const child = spawn(process.execPath, ['--input-type=module', '-e', script], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'], windowsHide: true })
      let diagnostics = ''
      child.stderr.on('data', chunk => { diagnostics += chunk })
      const exited = new Promise((resolveExit, reject) => { child.once('error', reject); child.once('exit', code => code === 0 ? resolveExit() : reject(new Error(diagnostics))) })
      return { child, ready: once(child, 'message'), exited, workspace }
    })
    await Promise.all(children.map(c => c.ready))
    children.forEach(c => c.child.send('go'))
    await Promise.all(children.map(c => c.exited))
    const rebooted = createWorkspaceTrust({ trustStore })
    for (const c of children) assert.ok(rebooted.allows(c.workspace))
    assert.ok(rebooted.allows(firstPath))
    assert.ok(rebooted.allows(secondPath))
    assert.ok(rebooted.allows(join(root, 'third')))
    assert.ok(!rebooted.allows(join(root, 'unknown')))
    writeFileSync(join(`${trustStore}.d`, 'f'.repeat(64) + '.json'), '{broken')
    writeFileSync(join(`${trustStore}.d`, 'e'.repeat(64) + '.json'), JSON.stringify({ workspace: join(root, 'forged') }))
    assert.ok(!createWorkspaceTrust({ trustStore }).allows(join(root, 'forged')))
    assert.ok(readdirSync(`${trustStore}.d`).every(name => /^[a-f0-9]{64}\.json$/.test(name)))
    // Revocation requires removing legacy grants AND independent entries,
    // followed by host restart. Existing instances intentionally keep memory.
    rmSync(trustStore)
    rmSync(`${trustStore}.d`, { recursive: true })
    const revoked = createWorkspaceTrust({ trustStore })
    assert.ok(!revoked.allows(firstPath))
    assert.ok(!revoked.allows(secondPath))
    assert.ok(first.allows(firstPath))
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('trust entry directories cannot redirect persistence through a symlink', t => {
  const root = mkdtempSync(join(tmpdir(), 'tutorloop-trust-link-'))
  try {
    const originalStore = join(root, 'original.json')
    const original = createWorkspaceTrust({ trustStore: originalStore })
    const known = join(root, 'known')
    original.touch(known)
    const linkedStore = join(root, 'linked.json')
    try { symlinkSync(`${originalStore}.d`, `${linkedStore}.d`, process.platform === 'win32' ? 'junction' : 'dir') }
    catch (error) { if (error.code === 'EPERM') { t.skip('directory symlinks unavailable'); return } throw error }
    const linked = createWorkspaceTrust({ trustStore: linkedStore })
    assert.ok(!linked.allows(known))
    linked.touch(join(root, 'new'))
    assert.equal(readdirSync(`${originalStore}.d`).length, 1)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
