import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createBridge } from '../src/bridge-client.js'
import { createTools, TEACHING_GUIDANCE, apply } from '../src/index.js'

test('tool protocol forwards answer version and parses feedback without writing memoir', async () => {
  const calls = []
  const tools = createTools(async (...args) => { calls.push(args); return { attempt_id: 'a1' } })
  assert.equal(tools.length, 18)
  assert.ok(tools.every(tool => tool.name.startsWith('tutor_')))
  const signal = new AbortController().signal
  const submit = tools.find(t => t.name === 'tutor_submit_answer')
  await submit.execute({ exercise_id: 'e', answer: '用户原文', submission_id: 's', expected_version: 2, visual_confirmed: true }, { signal, agent: { session: { header: { cwd: 'C:/teaching' } } } })
  assert.equal(calls[0][1].expected_version, 2)
  assert.equal(calls[0][1].visual_confirmed, true)
  assert.equal(submit.parameters.properties.visual_confirmed.type, 'boolean')
  assert.equal(calls[0][2], signal)
  assert.equal(calls[0][3].cwd, 'C:/teaching')
  const feedback = tools.find(t => t.name === 'tutor_apply_feedback')
  await feedback.execute({ attempt_id: 'a1', feedback_json: '{"criteria":[]}' }, { signal })
  assert.deepEqual(calls[1][1], { attempt_id: 'a1', feedback: { criteria: [] } })
  await assert.rejects(feedback.execute({ feedback_json: '[]' }, { signal }), /JSON对象/)
  assert.match(TEACHING_GUIDANCE, /不自动调用 memoir_record/)
  assert.match(TEACHING_GUIDANCE, /等待用户独立作答/)
  assert.match(TEACHING_GUIDANCE, /learning_profile.goal/)
  assert.match(TEACHING_GUIDANCE, /baseline/)
  assert.match(TEACHING_GUIDANCE, /通用教学/)
  assert.match(TEACHING_GUIDANCE, /默认使用中文/)
  assert.match(TEACHING_GUIDANCE, /language_settings.resolved_language/)
  const create = tools.find(t => t.name === 'tutor_create_practice')
  await create.execute({ question_json: '{"stem":"解释概念"}', source_ids: ['stored-source'] }, { signal })
  assert.deepEqual(calls[2][1], { question: { stem: '解释概念' }, source_ids: ['stored-source'], mode: 'coach' })
  await assert.rejects(create.execute({ question_json: '[]', source_ids: [] }, { signal }), /JSON对象/)
  const find = tools.find(t => t.name === 'tutor_find_materials')
  await find.execute({ query: '数学' }, { signal })
  assert.deepEqual(calls[3][1], { query: '数学', limit: 5 })
  const prepare = tools.find(t => t.name === 'tutor_prepare_rubric')
  await prepare.execute({ exercise_id: 'e', rubric_json: '[{"name":"具体要点"}]', expected_version: 3 }, { signal })
  assert.equal(calls[4][0], 'prepare_rubric')
  assert.deepEqual(calls[4][1], { exercise_id: 'e', rubric: [{ name: '具体要点' }], expected_version: 3 })
  await assert.rejects(prepare.execute({ rubric_json: '{}' }, { signal }), /JSON数组/)
})

test('real subprocess JSON stdin/stdout, Unicode and literal shell characters', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'gongkao bridge '))
  try {
    writeFileSync(join(dir, 'bridge.py'), 'import sys,json,time\nr=json.load(sys.stdin)\nif r["payload"].get("sleep"): time.sleep(10)\nif r["payload"].get("bad"): print("not json")\nelse: print(json.dumps({"ok":True,"data":r},ensure_ascii=False))\n')
    const config = { projectPath: dir, pythonPath: process.env.TUTORLOOP_TEST_PYTHON ?? 'python', workspacePath: dir, timeoutMs: 5000 }
    const request = createBridge(config)
    const payload = { text: '中文 & $(whoami) `x` ; "引号"' }
    const result = await request('get_context', payload)
    assert.deepEqual(result.payload, payload)
    assert.equal(result.scope.workspacePath, dir)
    assert.equal(result.scope.source, 'config')
    assert.equal(result.scope.dbPath, undefined)
    await assert.rejects(request('unknown'), /未知/)
    await assert.rejects(request('overview', { bad: true }), /JSON/)
    const controller = new AbortController()
    const pending = request('overview', { sleep: true }, controller.signal)
    setTimeout(() => controller.abort(), 50)
    await assert.rejects(pending)
    await assert.rejects(createBridge({ ...config, timeoutMs: 30 })('overview', { sleep: true }), /超时/)
    await assert.rejects(createBridge({ ...config, maxOutputBytes: 1 })('overview'), /限制/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('plugin lifecycle uses public registrations and disposers', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gongkao-lifecycle-'))
  try {
    writeFileSync(join(dir, 'bridge.py'), '')
    const tools = [], sections = [], disposers = []
    let disposed = 0
    apply({
      tools: { register: tool => { tools.push(tool); return () => disposed++ } },
      systemPrompt: { section: section => { sections.push(section); return () => disposed++ } },
      effect: effect => disposers.push(effect()),
      inject: (deps, callback) => { assert.deepEqual(deps, ['webServer']); callback({ webServer: { register: route => { assert.equal(route.path, '/api/dsh-tutorloop/action'); return () => disposed++ } }, effect: effect => disposers.push(effect()) }) },
    }, { projectPath: dir, trustStore: join(dir, 'isolated-trust.json') })
    assert.equal(tools.length, 18)
    assert.equal(sections[0].interpolate, false)
    disposers.forEach(dispose => dispose())
    assert.equal(disposed, 20)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('legacy names replace historic names without duplicate registration', () => {
  const tools = createTools(async () => ({}), { legacyToolNames: true })
  assert.equal(tools.length, 18)
  assert.equal(new Set(tools.map(tool => tool.name)).size, tools.length)
  assert.ok(tools.some(tool => tool.name === 'gongkao_submit_answer'))
  assert.ok(!tools.some(tool => tool.name === 'tutor_submit_answer'))
  assert.ok(tools.some(tool => tool.name === 'tutor_create_practice'))
})

test('effective teaching guidance separates independent tasks, registered hints and scoped feedback', () => {
  // Guard the actual host-injected guidance, rather than the unused Python
  // lesson prompt. These checks cover instructions, not model compliance.
  assert.match(TEACHING_GUIDANCE, /首次展示仅含学生材料、题目任务/)
  assert.match(TEACHING_GUIDANCE, /任何题目特定引导必须先成功调用tutor_reveal/)
  assert.match(TEACHING_GUIDANCE, /盯着两个数字/)
  assert.match(TEACHING_GUIDANCE, /不报exercise_id、attempt_id、version、JSON/)
  assert.match(TEACHING_GUIDANCE, /题干只要求“一处变化”时不得按两处事实都写才满分/)
  assert.match(TEACHING_GUIDANCE, /strengths\/omissions\/unsupported_claims必须为字符串数组/)
  assert.match(TEACHING_GUIDANCE, /improved_answer不能遗漏/)
  assert.match(TEACHING_GUIDANCE, /不能把未要求的数字、细节或展开内容临时列作扣分点或漏点/)
  assert.match(TEACHING_GUIDANCE, /先核对student_span逐字属于学生答案/)
  assert.match(TEACHING_GUIDANCE, /只展开一个优先问题/)
  assert.match(TEACHING_GUIDANCE, /已展示的P2\/P3属于已见材料练习/)
  assert.match(TEACHING_GUIDANCE, /一个优先错误只在确有错误时提出/)
  assert.match(TEACHING_GUIDANCE, /答案已覆盖要求时，具体肯定成立的要点与依据/)
  assert.match(TEACHING_GUIDANCE, /不能仅因多段出现相似词就判重复/)
  assert.match(TEACHING_GUIDANCE, /先核对所指对象、实际行为及效果是否相同/)
})

test('host language config validates the same three supported modes', () => {
  assert.throws(() => createBridge({ language: 'fr' }), /language/)
  assert.throws(() => createBridge({ language: '' }), /language/)
  for (const language of ['zh', 'en', 'auto']) assert.equal(typeof createBridge({ language }), 'function')
})
