import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { createBridge } from '../src/bridge-client.js'
import { createTools } from '../src/index.js'
import { createActionRoute, createWorkspaceTrust } from '../src/server.js'

test('bundled backend: generic teaching, student privacy and workspace isolation', { skip: !process.env.TUTORLOOP_TEST_PYTHON && process.env.TUTORLOOP_E2E !== '1' }, async () => {
  const temp = mkdtempSync(join(tmpdir(), 'tutorloop-e2e-'))
  const other = mkdtempSync(join(tmpdir(), 'tutorloop-other-'))
  try {
    const config = { pythonPath: process.env.TUTORLOOP_TEST_PYTHON ?? 'python' }
    const request = createBridge(config)
    const tools = createTools(request)
    const signal = new AbortController().signal
    const call = async (action, args = {}, cwd = temp) => JSON.parse((await tools.find(tool => tool.name === `tutor_${action}`).execute(args, { signal, agent: { session: { header: { cwd } } } })).data_json)
    assert.equal((await call('overview')).attempts, 0)
    await call('set_profile', { name: '英语基础', goal: '掌握一般现在时', daily_minutes: 30, baseline: '尚未诊断', subjects: ['英语'] })
    writeFileSync(join(temp, 'english.txt'), '一般现在时描述习惯动作。第三人称单数主语的肯定句中，实义动词通常加s或es。')
    await call('import_file', { path: 'english.txt' })
    const materials = await call('find_materials', { query: '英语一般现在时' })
    assert.ok(materials.sources.length)
    const source = materials.sources[0]
    assert.match(source.text, /第三人称/)
    const question = { difficulty: '基础', subject: '英语', skill: '一般现在时', material: source.text, stem: '说明第三人称单数肯定句的动词形式。', word_limit: 100, reference_answer: '实义动词通常加s或es。', rubric: [{ name: '动词形式', requirement: '准确说明加s或es', points: 10, evidence_ids: [source.id] }], hint: '注意主语的人称与单复数。' }
    const created = await call('create_practice', { question_json: JSON.stringify(question), source_ids: [source.id] })
    assert.equal(created.question.subject, '英语')
    assert.equal(created.question.reference_answer, undefined)
    assert.equal(created.scope.workspacePath, temp)
    assert.equal(created.scope.source, 'execution')
    const student = await call('student_state', { exercise_id: created.id })
    assert.ok(!JSON.stringify(student).includes('reference_answer'))
    const frozen = await call('get_context', { exercise_id: created.id })
    assert.equal(frozen.exercise.question.rubric[0].points, 10)
    assert.equal(frozen.exercise.sources[0].id, source.id)
    assert.match(frozen.exercise.learning_profile.goal, /一般现在时/)
    const attempt = await call('submit_answer', { exercise_id: created.id, answer: '实义动词通常加s或es。', submission_id: 'english-independent', expected_version: frozen.exercise.version })
    const feedback = { criteria: [{ name: '动词形式', awarded: 10, feedback: '与原文规则一致', evidence_ids: [source.id], student_span: '加s或es' }], strengths: ['表达规则准确'], omissions: [], unsupported_claims: [], organization_feedback: '清楚', improved_answer: question.reference_answer, next_skill: '一般现在时', next_exercise_instruction: '换新句子独立复测' }
    assert.equal((await call('apply_feedback', { attempt_id: attempt.attempt_id, feedback_json: JSON.stringify(feedback) })).score, 10)
    const current = (await call('overview')).current_exercise.id
    await assert.rejects(call('create_practice', { question_json: JSON.stringify(question), source_ids: ['nonexistent-source'] }), /不存在/)
    assert.equal((await call('overview')).current_exercise.id, current)
    assert.equal((await call('export_memoir')).candidate_only, true)
    assert.ok(await call('method_cards'))
    const restored = await createBridge(config)('overview', {}, signal, { cwd: temp })
    assert.equal(restored.current_exercise.id, current)
    assert.equal((await call('overview', {}, other)).attempts, 0)
    assert.equal((await call('list_sources', {}, other)).items.length, 0)
    await assert.rejects(call('get_context', { exercise_id: created.id }, other), /不存在/)
    await assert.rejects(call('import_file', { path: join(temp, 'english.txt') }, other), /工作区/)
    const shared = await createBridge({ ...config, dbPath: join(temp, '.dsh-tutorloop', 'tutor.sqlite3') })('overview', {}, signal, { cwd: other })
    assert.equal(shared.current_exercise.id, current)
  } finally {
    rmSync(temp, { recursive: true, force: true })
    rmSync(other, { recursive: true, force: true })
  }
})

test('real student API language settings persist per workspace and resolve auto', { skip: !process.env.TUTORLOOP_TEST_PYTHON && process.env.TUTORLOOP_E2E !== '1' }, async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'tutorloop-language-'))
  const other = mkdtempSync(join(tmpdir(), 'tutorloop-language-other-'))
  const config = { pythonPath: process.env.TUTORLOOP_TEST_PYTHON ?? 'python', workspacePath: workspace, language: 'zh' }
  const request = createBridge(config)
  const trust = createWorkspaceTrust(config)
  const server = createServer(createActionRoute(request, trust).handler)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}`
  const send = async payload => {
    const response = await fetch(base, { method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: JSON.stringify({ action: 'language_settings', payload, cwd: workspace }) })
    return { status: response.status, body: await response.json() }
  }
  try {
    const initial = await send({})
    assert.equal(initial.body.data.language, 'zh')
    const chosen = await send({ language: 'auto', resolved_language: 'en' })
    assert.equal(chosen.status, 200)
    assert.equal(chosen.body.data.resolved_language, 'en')
    const restored = await createBridge({ ...config, language: 'en' })('language_settings')
    assert.equal(restored.language, 'auto')
    assert.equal(restored.resolved_language, 'en')
    assert.equal((await request('overview')).language_settings.resolved_language, 'en')
    assert.equal((await send({ resolved_language: 'zh' })).body.data.resolved_language, 'zh')
    for (const payload of [{ language: 'fr' }, { language: null }, { language: 'en', resolved_language: 'zh' }, { resolved_language: 'auto' }]) {
      const invalid = await send(payload)
      assert.equal(invalid.status, 400)
      assert.equal(invalid.body.ok, false)
    }
    assert.equal((await send({})).body.data.language, 'auto')
    assert.equal((await send({})).body.data.resolved_language, 'zh')
    const otherWorkspace = await request('language_settings', {}, undefined, { cwd: other })
    assert.equal(otherWorkspace.language, 'zh')
    assert.equal((await createBridge({ ...config, workspacePath: other, language: 'en' })('language_settings')).language, 'en')
  } finally {
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
    rmSync(workspace, { recursive: true, force: true })
    rmSync(other, { recursive: true, force: true })
  }
})
