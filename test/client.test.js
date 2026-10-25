import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { build } from 'esbuild'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { studentAction } from '../src/client/api.js'
import { mountStyles, PANEL_CSS } from '../src/client/styles.js'
import { detectLanguage, translate } from '../src/client/i18n.js'

const repo = dirname(dirname(fileURLToPath(import.meta.url)))

test('student API carries cwd, unwraps data and forbids teacher actions', async () => {
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => ({ ok: true, data: { exercise: null } }) } }
  try {
    assert.deepEqual(await studentAction('C:/learning', 'student_state'), { exercise: null })
    assert.equal(calls[0].url, '/api/dsh-tutorloop/action')
    assert.equal(calls[0].options.credentials, 'same-origin')
    assert.deepEqual(JSON.parse(calls[0].options.body), { cwd: 'C:/learning', action: 'student_state', payload: {} })
    for (const action of ['get_context', 'apply_feedback', 'create_practice']) await assert.rejects(studentAction('C:/learning', action), /不支持/)
    await assert.rejects(studentAction('', 'overview'), /工作目录/)
    assert.equal(calls.length, 1)
    globalThis.fetch = async () => ({ ok: false, json: async () => ({ ok: false, error: { message: '运行时未初始化；请运行 npm exec dsh-tutorloop init' } }) })
    await assert.rejects(studentAction('C:/learning', 'overview'), /运行时未初始化/)
  } finally { globalThis.fetch = original }
})

test('native view mounts with session scope, student records, forms and disposes cleanly', async t => {
  t.mock.timers.enable({ apis: ['setInterval'] })
  const dir = await mkdtemp(join(repo, 'test', '.client-'))
  const dom = new JSDOM('<!doctype html><html lang="en"><head></head><body><main id="root"></main></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
  const old = Object.fromEntries(['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT', 'fetch'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]))
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: dom.window }, document: { configurable: true, value: dom.window.document },
    navigator: { configurable: true, value: dom.window.navigator }, IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
  })
  let root
  const cleanups = []
  const requests = []
  const cwd = 'C:/learning/英语'
  let currentExercise = null
  let currentAttempts = []
  let quizState = { active: false }
  let opened = ''
  let savedLanguage = { language: 'zh', resolved_language: 'zh' }
  const profile = { id: 'generic', name: '英语阅读', goal: '读懂短文', daily_minutes: 30, baseline: '未诊断', subjects: ['英语'] }
  const exercise = { id: 'ex1', version: 0, mode: 'coach', question: { skill: '时态', subject: '英语', question_type: 'short_answer', material: '[P1] I have lived here for years.', stem: '解释时态作用', word_limit: 80 },
    materials: [{ id: 'P1', title: '公开英语资料', locator: 'P1', url: '', text: 'I have lived here for years, and I still remember the old harbour.' }] }
  const answer = '从过去持续到现在'
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body); requests.push(request)
    let data
    switch (request.action) {
      case 'language_settings': if (request.payload.language) savedLanguage = { ...request.payload }; data = savedLanguage; break
      case 'overview': data = { learning_profile: profile, sources: 1, attempts: currentAttempts.length, pending: 5, current_exercise: currentExercise, seed_choices: [{ id: 'seed1', subject: '英语', skill: '时态' }, { id: 'unrelated-exam', subject: '行测', skill: '增长率' }], due: [] }; break
      case 'student_state': data = { learning_profile: profile, exercise: currentExercise, attempts: currentAttempts }; break
      case 'list_sources': data = { items: [{ id: 'P1', title: '公开英语资料', kind: 'web_snippet_only', locator: '摘要' }] }; break
      case 'method_cards': data = { cards: [{ id: 'card1', title: '先看关系', subject: '教学整理', steps: ['先做一个判断'], example: '一条例子', pitfall: '避免泛化', next_action: '换句验证', source_note: '不是官方标准' }] }; break
      case 'start_practice': currentExercise = exercise; data = exercise; break
      case 'zhenti_papers': data = { papers: [{ paper_id: 900001, name: '2024行测样卷', subject: '行测', kind: '真题卷', year: 2024, count: 2 }], skills: { 行测: ['政治常识'], 申论: [] } }; break
      case 'zhenti_paper': data = { paper_id: 900001, name: '2024行测样卷', subject: '行测', kind: '真题卷', year: 2024, questions: [{ no: 1, qid: '501', seed: 'zhenti:900001:501', t: 'single', skill: '政治常识', ok: true }] }; break
      case 'zhenti_quiz_state': data = quizState; break
      case 'zhenti_start_quiz': currentExercise = exercise; quizState = { active: true, quiz_id: 'q', title: '整卷 · 2024行测样卷', total: 2, index: 0, current_seed: 'zhenti:900001:501', finished: false }; data = quizState; break
      case 'submit_answer': currentExercise = { ...exercise, version: 1 }; currentAttempts = [{ id: 'a1', answer: request.payload.answer, status: 'pending', assisted: 0 }]; data = { status: 'pending', attempt_id: 'a1' }; break
      default: data = {}
    }
    return { ok: true, json: async () => ({ ok: true, data: { ...data, scope: { workspacePath: cwd } } }) }
  }
  try {
    const output = join(dir, 'client.mjs')
    await build({ entryPoints: [join(repo, 'src/client/index.jsx')], outfile: output, bundle: true, format: 'esm', platform: 'browser', jsx: 'automatic', external: ['react', 'react/jsx-runtime'] })
    const client = await import(pathToFileURL(output).href)
    let registration, render, disposed = 0
    const ctx = {
      effect(callback) { cleanups.push(callback()) },
      slots: {
        inject(name, callback) { assert.equal(name, 'conversation.view'); const off = callback(); return () => { disposed++; off?.() } },
        register(meta, callback) { registration = meta; render = callback; return () => { disposed++ } },
      },
    }
    client.apply(ctx)
    assert.deepEqual(client.inject, ['slots'])
    assert.equal(registration.id, 'tutorloop')
    assert.equal(registration.label(), 'TutorLoop')
    const { createRoot } = await import('react-dom/client')
    root = createRoot(document.getElementById('root'))
    const flush = async callback => { await act(async () => { callback?.(); await new Promise(resolve => setTimeout(resolve, 0)) }) }
    const button = text => [...document.querySelectorAll('button')].find(node => node.textContent === text)
    let acknowledged = 0
    await flush(() => root.render(render({ sessionId: 'session1', useSessions: selector => selector({ byId: { session1: { cwd } } }), viewRequest: { view: 'tutorloop' }, completeViewRequest: () => acknowledged++, openView: name => { opened = name } })))
    assert.equal(acknowledged, 1)
    assert.match(document.body.textContent, /英语阅读/)
    assert.equal(document.querySelector('option[value="unrelated-exam"]'), null)
    assert.match(document.body.textContent, /刷新记录/)
    assert.equal(document.querySelector('select[aria-label="Language / 语言"]').value, 'zh')
    assert.ok(requests.every(request => request.cwd === cwd))
    assert.equal(document.querySelectorAll('style[data-tutorloop-style]').length, 1)
    assert.ok(PANEL_CSS.includes('--dsw-alias-bg-base'))
    assert.ok(PANEL_CSS.includes('--dsw-alias-label-primary'))
    assert.ok(PANEL_CSS.includes('prefers-color-scheme:dark'))
    assert.ok(PANEL_CSS.includes('[data-theme="dark"]'))
    assert.ok(PANEL_CSS.includes('background:var(--tl-card)'))
    await flush(() => button('资料').click())
    assert.match(document.body.textContent, /公开英语资料/)
    assert.match(document.body.textContent, /搜索摘要，非全文/)
    assert.equal(document.querySelector('input[type="url"]').placeholder, 'https://…')
    await flush(() => button('方法').click())
    assert.match(document.body.textContent, /先看关系/)
    await flush(() => button('目标').click())
    assert.match(document.body.textContent, /保存通用目标/)
    assert.ok([...document.querySelectorAll('input')].some(input => input.value === '英语阅读'))
    await flush(() => button('练习').click())
    const select = document.querySelector('section select')
    await flush(() => { select.value = 'seed1'; select.dispatchEvent(new window.Event('change', { bubbles: true })) })
    await flush(() => button('开始练习').click())
    assert.match(document.body.textContent, /解释时态作用/)
    assert.equal(document.querySelector('textarea').value, '')
    await flush(() => {
      const field = document.querySelector('textarea')
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(field, answer)
      field.dispatchEvent(new window.Event('input', { bubbles: true }))
    })
    await flush(() => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
    assert.equal(requests.find(request => request.action === 'submit_answer')?.payload.answer, answer)
    assert.match(document.body.textContent, /答案已保存/)
    // 卷面视图:材料原文可见,旧的拼接行不再重复出现。
    assert.match(document.body.textContent, /材料原文 · 1 段/)
    assert.match(document.body.textContent, /I have lived here for years, and I still remember the old harbour\./)
    assert.doesNotMatch(document.querySelector('section[aria-label="当前练习"]').textContent, /\[P1\]/)
    let copiedText = ''
    Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: async text => { copiedText = text } } })
    await flush(() => button('请导师批改（复制请求）').click())
    assert.equal(opened, 'chat')
    assert.match(copiedText, /exercise_id="ex1"/)
    assert.match(copiedText, /attempt_id="a1"/)
    assert.match(copiedText, /不要改读其他/)
    assert.match(document.body.textContent, /请求已复制/)
    assert.match(client.gradingRequest('ex1', 'a1', 'en'), /exercise_id="ex1"/)
    assert.doesNotMatch(client.gradingRequest('ex1', 'a1', 'en'), /请/)
    // No clipboard API must not claim success or navigate away from the fallback text.
    Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: undefined })
    opened = ''
    await flush(() => button('请导师批改（复制请求）').click())
    assert.equal(opened, '')
    assert.match(document.body.textContent, /复制失败/)
    // 模拟聊天模型批改完成:刷新后应渲染分项表格、遗漏要点与材料外推断。
    currentAttempts = [{ id: 'a1', answer, status: 'graded', assisted: 0,
      feedback: { score: 8, max_score: 10, next_skill: '依据判断', next_exercise_instruction: '换同类材料重写。',
        criteria: [{ name: '原因', awarded: 4, max_points: 4, feedback: '要点准确。', evidence_ids: ['P1'], student_span: '取消试样检验' }],
        omissions: ['启示缺少可执行动作'], unsupported_claims: ['“市场调研不足”为材料外推断'],
        organization_feedback: '结构清楚。', improved_answer: '改进后的示范答案。' } }]
    // Other workspace attempts remain pending; the current exercise still refreshes.
    await flush(() => t.mock.timers.tick(15000))
    assert.ok(requests.some(request => request.action === 'student_state' && request.payload.exercise_id === 'ex1'))
    assert.ok(document.querySelector('table.tutorloop-table'))
    assert.match(document.body.textContent, /原因 4\/4|原因.*4\/4/)
    assert.match(document.body.textContent, /遗漏要点/)
    assert.match(document.body.textContent, /材料外推断/)
    assert.match(document.body.textContent, /“市场调研不足”为材料外推断/)
    assert.match(document.body.textContent, /改进后的示范答案。/)
    // 真题与整卷:载入列表→选卷→浏览题目→开始整卷
    await flush(() => button('载入真题列表').click())
    assert.match(document.body.textContent, /真题与整卷/)
    assert.match(document.body.textContent, /1 套卷可选/)
    const paperSelect = document.querySelector('section[aria-label="真题与整卷"] label select')
    await flush(() => { paperSelect.value = '900001'; paperSelect.dispatchEvent(new window.Event('change', { bubbles: true })) })
    assert.match(document.body.textContent, /政治常识/)
    await flush(() => button('开始整卷').click())
    assert.match(document.body.textContent, /整卷 · 2024行测样卷/)
    assert.match(document.body.textContent, /第 1 \/ 2 题/)
    assert.ok(requests.some(request => request.action === 'zhenti_start_quiz'))
    const language = document.querySelector('select[aria-label="Language / 语言"]')
    await flush(() => { language.value = 'en'; language.dispatchEvent(new window.Event('change', { bubbles: true })) })
    assert.match(document.body.textContent, /Criteria scores/)
    assert.match(document.body.textContent, /Your attempts/)
    assert.match(document.body.textContent, /Attempt 1 · Reviewed/)
    assert.match(document.body.textContent, /从过去持续到现在/)
    assert.equal(document.querySelector('.tutorloop-panel').lang, 'en')
    assert.deepEqual(savedLanguage, { language: 'en', resolved_language: 'en' })
    // A fresh mount restores workspace settings, independent of host language.
    await flush(() => root.unmount()); root = null
    root = createRoot(document.getElementById('root'))
    await flush(() => root.render(React.createElement(client.TutorLoopPanel, { cwd, openChat: () => {} })))
    assert.match(document.body.textContent, /Refresh/)
    assert.equal(document.querySelector('select[aria-label="Language / 语言"]').value, 'en')
    const savedSelector = document.querySelector('select[aria-label="Language / 语言"]')
    await flush(() => { savedSelector.value = 'auto'; savedSelector.dispatchEvent(new window.Event('change', { bubbles: true })) })
    assert.deepEqual(savedLanguage, { language: 'auto', resolved_language: 'en' })
    await flush(() => document.documentElement.setAttribute('lang', 'zh-CN'))
    assert.match(document.body.textContent, /刷新记录/)
    assert.deepEqual(savedLanguage, { language: 'auto', resolved_language: 'zh' })
    await flush(() => document.documentElement.setAttribute('lang', 'en-GB'))
    assert.match(document.body.textContent, /Refresh/)
    assert.deepEqual(savedLanguage, { language: 'auto', resolved_language: 'en' })
    await flush(() => document.documentElement.removeAttribute('lang'))
    assert.match(document.body.textContent, /刷新记录/)
    assert.deepEqual(savedLanguage, { language: 'auto', resolved_language: 'zh' })
    assert.ok(!requests.some(request => ['get_context', 'apply_feedback'].includes(request.action)))
    // A qualitative result never displays null/10 or a fabricated zero.
    currentAttempts = [{ id: 'a2', answer, status: 'graded', feedback: { grading_status: 'qualitative', score: null, max_score: null, criteria: [], omissions: [], unsupported_claims: [] } }]
    await flush(() => button('刷新记录').click())
    assert.match(document.body.textContent, /定性反馈/)
    assert.doesNotMatch(document.body.textContent, /null\s*\/|教学参考分：\s*\/|教学参考分：0/)
    // Real image events gate submission. An error cannot be acknowledged as complete.
    currentAttempts = []
    currentExercise = { ...exercise, id: 'image-ex', question: { ...exercise.question, question_type: 'single_choice',
      visual_required: true, visual_supported: true,
      stem_blocks: [{ type: 'text', text: '选择图形' }, { type: 'image', url: 'https://fb.fbstatic.cn/review.png' }],
      options: [{ id: 'A', text: '甲' }, { id: 'B', text: '乙' }] } }
    await flush(() => button('刷新记录').click())
    await flush(() => document.querySelector('input[type="radio"][value="B"]').click())
    assert.equal(button('保存并提交').disabled, true)
    const illustration = document.querySelector('section[aria-label="当前练习"] img')
    await flush(() => illustration.dispatchEvent(new window.Event('error')))
    assert.match(document.body.textContent, /图片加载失败/)
    assert.equal(document.querySelector('input[type="checkbox"]').disabled, true)
    Object.defineProperty(illustration, 'naturalWidth', { configurable: true, value: 120 })
    await flush(() => illustration.dispatchEvent(new window.Event('load')))
    assert.equal(document.querySelector('input[type="checkbox"]').disabled, false)
    assert.equal(button('保存并提交').disabled, true)
    await flush(() => document.querySelector('input[type="checkbox"]').click())
    assert.equal(button('保存并提交').disabled, false)
    await flush(() => button('保存并提交').click())
    assert.equal(requests.filter(request => request.action === 'submit_answer').at(-1).payload.visual_confirmed, true)
    currentAttempts = []
    currentExercise = { ...exercise, id: 'unsafe-image', question: { ...exercise.question, visual_required: true, visual_supported: true,
      stem_blocks: [{ type: 'text', text: '<script>unsafe()</script>' },
        ...['javascript:alert(1)', 'https://fb.fbstatic.cn.evil.invalid/a.png', 'https://fb.fbstatic.cn/a.svg', 'http://fb.fbstatic.cn/a.png'].map(url => ({ type: 'image', url }))] } }
    await flush(() => button('刷新记录').click())
    const unsafeSection = document.querySelector('section[aria-label="当前练习"]')
    assert.equal(unsafeSection.querySelectorAll('img,script').length, 0)
    assert.equal(unsafeSection.querySelector('input[type="checkbox"]').disabled, true)
    assert.match(unsafeSection.textContent, /<script>unsafe\(\)<\/script>/)
    await flush(() => root.unmount()); root = null
    const afterUnmount = requests.length
    await flush(() => document.documentElement.setAttribute('lang', 'en'))
    assert.equal(requests.length, afterUnmount)
    cleanups.reverse().forEach(cleanup => cleanup?.())
    assert.equal(document.querySelectorAll('style[data-tutorloop-style]').length, 0)
    assert.equal(disposed, 2)
  } finally {
    if (root) await act(async () => root.unmount())
    for (const [key, descriptor] of Object.entries(old)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key] }
    dom.window.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('stylesheet duplicate mount never removes another owner', () => {
  const doc = new JSDOM('<html><head></head><body></body></html>').window.document
  const first = mountStyles(doc), second = mountStyles(doc)
  second(); assert.equal(doc.querySelectorAll('style').length, 1)
  first(); assert.equal(doc.querySelectorAll('style').length, 0)
})

test('auto language follows DSH document only, falls back to Chinese, and preserves material', () => {
  assert.equal(detectLanguage({ documentElement: { lang: 'en-US' } }), 'en')
  assert.equal(detectLanguage({ documentElement: { lang: 'zh-Hans' } }), 'zh')
  assert.equal(detectLanguage({ documentElement: { lang: '' } }, { language: 'fr-FR' }), 'zh')
  assert.equal(translate('刷新记录', 'en'), 'Refresh')
  assert.equal(translate('这是原始学习材料，不翻译。', 'en'), '这是原始学习材料，不翻译。')
})
