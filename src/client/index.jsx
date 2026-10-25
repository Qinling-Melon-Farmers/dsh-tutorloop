import React, { useCallback, useEffect, useRef, useState } from 'react'
import { studentAction, items, value } from './api.js'
import { mountStyles } from './styles.js'
import { detectLanguage, localize } from './i18n.js'
import { RichContent, imageRequirements } from './rich-content.jsx'

export const inject = ['slots']

export function ConversationTutorLoop({ sessionId, useSessions, viewRequest, completeViewRequest, openView }) {
  const cwd = useSessions(snapshot => snapshot.byId[sessionId]?.cwd ?? '')
  useEffect(() => { if (viewRequest?.view === 'tutorloop') completeViewRequest?.() }, [viewRequest, completeViewRequest])
  return <TutorLoopPanel key={cwd} cwd={cwd} openChat={() => openView?.('chat', '')} />
}

function Feedback({ feedback, language }) {
  if (!feedback) return null
  const scored = typeof feedback.score === 'number' && feedback.grading_status !== 'qualitative'
  return localize(<div className="tutorloop-card"><h3>本次反馈</h3>{scored ? <p>教学参考分：{feedback.score} / {feedback.max_score} · 非官方评分</p> : <p>定性反馈：本题尚无确认的分项量表，不计数值成绩。</p>}
    <p>{feedback.next_skill}：{feedback.next_exercise_instruction}</p>
    {Boolean(feedback.criteria?.length) && <table className="tutorloop-table"><caption className="tutorloop-sr-only">分项得分</caption><thead><tr><th scope="col">维度</th><th scope="col">得分</th><th scope="col">反馈</th></tr></thead><tbody>{feedback.criteria.map(item => <tr key={item.name}><th scope="row" data-tutorloop-content>{item.name}</th><td>{scored ? `${item.awarded}/${item.max_points}` : '—'}</td><td><span data-tutorloop-content>{item.feedback}</span>{item.student_span && <><br /><small>你的原句：<span data-tutorloop-content>{item.student_span}</span></small></>}{Boolean(item.evidence_ids?.length) && <><br /><small>材料依据：<span data-tutorloop-content>{item.evidence_ids.join('、')}</span></small></>}</td></tr>)}</tbody></table>}
    {Boolean(feedback.omissions?.length) && <div className="tutorloop-warning"><strong>遗漏要点</strong><ul>{feedback.omissions.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
    {Boolean(feedback.unsupported_claims?.length) && <div className="tutorloop-warning"><strong>材料外推断</strong><ul>{feedback.unsupported_claims.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
    <p>{feedback.organization_feedback}</p><details><summary>改写示范</summary><p>{feedback.improved_answer}</p></details></div>, language)
}

/** 卷面视图:材料原文折叠区。长材料默认收起,保持题干可见;材料文本永不翻译。 */
function MaterialPassages({ materials, language, onAssetState }) {
  const list = materials || []
  if (!list.length) return null
  const totalChars = list.reduce((sum, m) => sum + (m.text?.length || 0), 0)
  const hasImages = list.some(material => material.blocks?.some(block => block.type === 'image'))
  return localize(<details className="tutorloop-card" open={totalChars <= 400 || hasImages}><summary>材料原文 · {list.length} 段 · 约 {totalChars} 字</summary>
    {list.map((m, index) => <article key={m.id || index}><h4 data-tutorloop-content>{m.id} · {m.title || m.locator || `材料 ${index + 1}`}</h4><div className="tutorloop-material" data-tutorloop-content><RichContent blocks={m.blocks} text={m.text} onAssetState={onAssetState} language={language} /></div>{m.url && /^https?:\/\//i.test(m.url) && <a href={m.url} target="_blank" rel="noreferrer">查看原始来源</a>}</article>)}
    {list.some(material => material.needs_visual_review) && <p className="tutorloop-warning">这份资料经过文字提取，图形、表格与段落顺序请对照原件核对。</p>}
    <p><small>这里仅展示已指定的学生材料，教师参考资料单独保存。</small></p></details>, language)
}

export function gradingRequest(exerciseId, attemptId, language = 'zh') {
  return language === 'en'
    ? `Please call tutor_get_context with exercise_id="${exerciseId}" and review my submitted attempt_id="${attemptId}" using its frozen materials and rubric. Verify the exercise/attempt match internally. Do not use a different current exercise or submit another answer for me. If the rubric is uncalibrated, give qualitative feedback only. Explain the result in plain English without repeating IDs, versions, JSON or internal states; focus on one useful next step and do not add requirements beyond the question.`
    : `请调用 tutor_get_context，指定 exercise_id="${exerciseId}"，批改我已提交的 attempt_id="${attemptId}"。在内部核对作答属于这道题，再依据冻结材料与量表反馈；不要改读其他“当前练习”，不要代我重新提交。量表尚未确认时只给定性反馈。给我的解释只用自然语言，不复述ID、版本、JSON或内部状态；只展开一个有帮助的下一步，不增加题目之外的要求。`
}

function PaperReport({ report, language, busy, onOpenExercise }) {
  return localize(<section className="tutorloop-card" aria-label="整卷报告">
    <h2 data-tutorloop-content>{report.title}</h2>
    <p>已提交 {report.answered}/{report.total} · 已评分 {report.scored ?? report.graded ?? 0} · 正确 {report.correct}
      {report.accuracy != null && <> · 正确率 {Math.round(report.accuracy * 100)}%</>}
      {Boolean(report.pending) && <> · 待批改 {report.pending}</>}</p>
    {Boolean(report.items?.length) && <div className="tutorloop-table-scroll"><table className="tutorloop-table">
      <caption className="tutorloop-sr-only">逐题结果</caption>
      <thead><tr><th scope="col">题号</th><th scope="col">考点</th><th scope="col">结果</th><th scope="col">你的作答</th><th scope="col">回看</th></tr></thead>
      <tbody>{report.items.map(item => <tr key={`${item.no}:${item.seed}`}><td>{item.no}</td><td data-tutorloop-content>{item.skill}</td>
        <td>{item.status === 'graded' ? (typeof item.score === 'number' ? `${item.score}/10` : '定性反馈') : item.status === 'pending' ? '待批改' : '未作答'}</td>
        <td data-tutorloop-content>{String(item.answer ?? '').slice(0, 80)}</td>
        <td>{item.exercise_id && <button disabled={busy} onClick={() => onOpenExercise(item.exercise_id)}>回看这题</button>}</td>
      </tr>)}</tbody>
    </table></div>}
    <p><small>仅统计本轮作答；正确率只计有数值评分的题目，定性反馈与待批改不计入。</small></p>
  </section>, language)
}

export function TutorLoopPanel({ cwd, openChat }) {
  const [languageMode, setLanguageMode] = useState('zh')
  const [hostLanguage, setHostLanguage] = useState(detectLanguage)
  const [languageReady, setLanguageReady] = useState(false)
  const language = languageMode === 'auto' ? hostLanguage : languageMode
  const [tab, setTab] = useState('练习')
  const [overview, setOverview] = useState(null)
  const [student, setStudent] = useState(null)
  const [sources, setSources] = useState([])
  const [cards, setCards] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [answer, setAnswer] = useState('')
  const [seed, setSeed] = useState('')
  const [mode, setMode] = useState('coach')
  const [revealText, setRevealText] = useState('')
  const [imageStates, setImageStates] = useState({})
  const [visualConfirmed, setVisualConfirmed] = useState(false)
  const [profileDraft, setProfileDraft] = useState({ name: '', goal: '', daily_minutes: 30, baseline: '' })
  const [path, setPath] = useState('')
  const [query, setQuery] = useState('')
  const [url, setUrl] = useState('')
  const [materialResult, setMaterialResult] = useState(null)
  const [zhenti, setZhenti] = useState(null)
  const [paperQ, setPaperQ] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [quizReport, setQuizReport] = useState(null)
  const [mixSubject, setMixSubject] = useState('行测')
  const [mixSkill, setMixSkill] = useState('')
  const [mixCount, setMixCount] = useState(10)
  const active = useRef(true)
  const controller = useRef(null)
  const running = useRef(false)
  const submission = useRef(null)
  const languageSave = useRef(Promise.resolve())
  const languageAbort = useRef(null)

  useEffect(() => {
    const Observer = globalThis.MutationObserver || document.defaultView?.MutationObserver
    if (!Observer) return
    const observer = new Observer(() => setHostLanguage(detectLanguage()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!languageReady || !cwd) return
    const aborter = languageAbort.current || new AbortController()
    languageAbort.current = aborter
    // Serialize changes so rapid selections cannot save an older mode last.
    languageSave.current = languageSave.current.catch(() => {}).then(() => {
      if (!active.current || aborter.signal.aborted) return
      return studentAction(cwd, 'language_settings', { language: languageMode, resolved_language: language }, aborter.signal)
    }).catch(e => { if (active.current && e.name !== 'AbortError') setError(e.message) })
  }, [languageMode, language, languageReady, cwd])

  async function refresh(signal, exerciseId) {
    const [nextOverview, nextStudent, nextSources, nextQuiz] = await Promise.all([
      studentAction(cwd, 'overview', {}, signal), studentAction(cwd, 'student_state', exerciseId ? { exercise_id: exerciseId } : {}, signal), studentAction(cwd, 'list_sources', {}, signal),
      studentAction(cwd, 'zhenti_quiz_state', {}, signal),
    ])
    if (!active.current) return
    setOverview(nextOverview); setStudent(nextStudent); setSources(items(nextSources)); setQuiz(nextQuiz)
    return { nextOverview, nextStudent }
  }

  useEffect(() => {
    active.current = true
    if (!cwd) return () => { active.current = false }
    const aborter = new AbortController(); controller.current = aborter
    setBusy(true)
    Promise.all([refresh(aborter.signal), studentAction(cwd, 'language_settings', {}, aborter.signal)]).then(([result, settings]) => {
      if (!active.current || !result) return
      const profile = result.nextOverview.learning_profile || result.nextStudent.learning_profile
      if (profile) setProfileDraft(profile)
      setLanguageMode(['zh', 'en', 'auto'].includes(settings.language) ? settings.language : 'zh')
      setHostLanguage(detectLanguage())
      setLanguageReady(true)
    }).catch(e => { if (e.name !== 'AbortError' && active.current) setError(e.message) })
      .finally(() => { if (active.current) setBusy(false) })
    return () => { active.current = false; aborter.abort(); controller.current?.abort(); languageAbort.current?.abort() }
  }, [cwd])

  async function run(task) {
    if (running.current) return
    running.current = true
    setBusy(true); setError(''); setNotice('')
    const aborter = new AbortController(); controller.current = aborter
    try { await task(aborter.signal) } catch (e) { if (e.name !== 'AbortError' && active.current) setError(e.message) }
    finally { running.current = false; if (active.current) setBusy(false) }
  }

  const exercise = student?.exercise || overview?.current_exercise
  const attempts = student?.attempts || []
  const question = exercise?.question
  const pending = attempts.some(a => a.status === 'pending')
  const profile = overview?.learning_profile || student?.learning_profile
  const subjects = new Set((profile?.subjects || []).map(subject => subject.normalize('NFKC').trim().toLowerCase()))
  const choices = (overview?.seed_choices || []).filter(item => subjects.has(String(item.subject || '').normalize('NFKC').trim().toLowerCase()))
  useEffect(() => { setSeed('') }, [profile?.id])
  const imageInfo = imageRequirements(question, exercise?.materials)
  const visualRequired = Boolean(question?.visual_required || imageInfo.urls.length || imageInfo.unsupported)
  const visualsLoaded = !imageInfo.unsupported && question?.visual_supported !== false && imageInfo.urls.length > 0 && imageInfo.urls.every(url => imageStates[url] === 'loaded')
  const visualBlocked = visualRequired && (!visualsLoaded || !visualConfirmed)
  const onAssetState = useCallback((url, state) => setImageStates(previous => previous[url] === state ? previous : { ...previous, [url]: state }), [])
  useEffect(() => { setAnswer(''); setRevealText(''); setVisualConfirmed(false); submission.current = null }, [exercise?.id])

  // 批改自动回流:待批改期间轻量轮询,聊天模型批改完自动更新面板;面板重新可见时也刷新。
  const pendingRef = useRef(false)
  useEffect(() => { pendingRef.current = pending }, [pending])
  useEffect(() => {
    if (!cwd || !pending || !exercise?.id) return
    const aborter = new AbortController()
    const exerciseId = exercise.id
    let inFlight = false
    const timer = setInterval(() => {
      if (!active.current || document.hidden || inFlight || running.current) return
      inFlight = true
      studentAction(cwd, 'student_state', { exercise_id: exerciseId }, aborter.signal).then(state => {
        if (!active.current || aborter.signal.aborted || state.attempts?.some(attempt => attempt.status === 'pending')) return
        setStudent(state)
        setNotice('批改已完成，反馈已更新。')
      }).catch(() => { /* retry transient failures without replacing another exercise */ }).finally(() => { inFlight = false })
    }, 15000)
    return () => { clearInterval(timer); aborter.abort() }
  }, [cwd, pending, exercise?.id])
  useEffect(() => {
    const onVisible = () => { if (!document.hidden && active.current && cwd && pendingRef.current) run(signal => refresh(signal)) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [cwd])

  async function startPractice(id) {
    await run(async signal => {
      await studentAction(cwd, 'start_practice', { seed_id: id, mode }, signal)
      if (!active.current) return
      setAnswer(''); setRevealText(''); submission.current = null
      await refresh(signal)
    })
  }

  async function submit(event) {
    event.preventDefault()
    if (!answer.trim() || !exercise || visualBlocked) return
    await run(async signal => {
      const signature = `${exercise.id}:${answer}`
      if (submission.current?.signature !== signature) submission.current = { signature, id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}` }
      const result = await studentAction(cwd, 'submit_answer', { exercise_id: exercise.id, answer, submission_id: submission.current.id, expected_version: exercise.version, visual_confirmed: visualRequired && visualsLoaded && visualConfirmed }, signal)
      await refresh(signal, exercise.id)
      if (active.current) setNotice(result.status === 'pending' ? '答案已保存。点击“请导师批改”复制请求，再回聊天粘贴发送。' : '作答已记录，下面可查看反馈。')
    })
  }

  async function copyToChat(request) {
    let copied = false
    try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(request); copied = true } } catch { /* show the request if clipboard permission is unavailable */ }
    setNotice(copied ? '请求已复制。已切回聊天，粘贴并发送即可。' : `复制失败，请手动复制：“${request}”`)
    if (copied) openChat?.()
  }

  async function requestGrading() {
    const attempt = [...attempts].reverse().find(item => item.status === 'pending')
    if (exercise && attempt) await copyToChat(gradingRequest(exercise.id, attempt.id, language))
  }

  async function requestRubric() {
    if (!exercise || attempts.length) return
    const request = language === 'en'
      ? `Please get TutorLoop exercise_id="${exercise.id}" with tutor_get_context. Before I answer, prepare a question-specific rubric using the source evidence and teacher reference. Save it with tutor_prepare_rubric and the latest expected_version. Do not reveal the reference answer or rubric points to me. If evidence is insufficient, keep qualitative feedback.`
      : `请用 tutor_get_context 读取 exercise_id="${exercise.id}"。在我作答前，根据题目、材料和教师参考制定题目特定的分项量表，用 tutor_prepare_rubric 和最新 expected_version 保存。不要向我透露参考答案或评分要点；依据不足就保留定性反馈。`
    await copyToChat(request)
  }

  async function reveal(kind) {
    await run(async signal => {
      const result = await studentAction(cwd, 'reveal', { exercise_id: exercise.id, kind }, signal)
      if (active.current) setRevealText(String(value(result) ?? ''))
      await refresh(signal)
    })
  }

  async function loadCards() {
    setTab('方法')
    if (!cards.length) await run(async signal => {
      const result = await studentAction(cwd, 'method_cards', {}, signal)
      if (active.current) setCards(result.cards || items(result))
    })
  }

  async function saveProfile(event, preset) {
    event?.preventDefault()
    await run(async signal => {
      const payload = preset ? { preset } : { name: profileDraft.name, goal: profileDraft.goal, daily_minutes: Number(profileDraft.daily_minutes), baseline: profileDraft.baseline }
      const result = await studentAction(cwd, 'set_profile', payload, signal)
      if (active.current && result.learning_profile) setProfileDraft(result.learning_profile)
      await refresh(signal)
      if (active.current) setNotice('学习目标已保存；已开始的练习保留原来的学习档案。')
    })
  }

  async function materialAction(action, payload) {
    await run(async signal => {
      const result = await studentAction(cwd, action, payload, signal)
      if (active.current) { setMaterialResult(result); setNotice(`资料处理完成，新增 ${result.added_chunks ?? 0} 个片段。请核对来源和完整性。`) }
      await refresh(signal)
    })
  }

  const [zhentiPaperId, setZhentiPaperId] = useState('')
  const [zhentiQSeed, setZhentiQSeed] = useState('')

  async function loadZhenti() {
    if (zhenti) return
    await run(async signal => {
      const result = await studentAction(cwd, 'zhenti_papers', {}, signal)
      if (active.current) setZhenti(result)
    })
  }

  async function openPaperQuestions(paperId) {
    setZhentiQSeed('')
    if (!paperId) { setPaperQ(null); return }
    await run(async signal => {
      const result = await studentAction(cwd, 'zhenti_paper', { paper_id: Number(paperId) }, signal)
      if (active.current) setPaperQ(result)
    })
  }

  async function quizAction(action, payload = {}, done) {
    await run(async signal => {
      const result = await studentAction(cwd, action, payload, signal)
      if (!active.current) return
      setQuiz(result.finished && result.report ? { ...result, report: result.report } : result)
      if (result.finished) setQuizReport(result.report || null)
      if (result.finished && !result.report) {
        const report = await studentAction(cwd, 'zhenti_report', {}, signal)
        if (active.current) setQuizReport(report)
      }
      done?.(result)
      await refresh(signal)
    })
  }

  async function openExercise(exerciseId) {
    await run(signal => refresh(signal, exerciseId))
  }

  return localize(<div className="tutorloop-panel" data-dsh-plugin="tutorloop" data-dsh-part="conversation-view" lang={language === 'zh' ? 'zh-CN' : 'en'}><div className="tutorloop-content">
    <header className="tutorloop-header"><div><h1>TutorLoop</h1><p className="tutorloop-muted">一次解决一个问题，练习后再验证。</p></div><div className="tutorloop-row"><select aria-label="Language / 语言" disabled={!languageReady || !cwd} value={languageMode} onChange={e => setLanguageMode(e.target.value)}><option value="zh">中文</option><option value="en">English</option><option value="auto">跟随 DSH</option></select><button disabled={busy || !cwd} onClick={() => run(signal => refresh(signal))}>刷新记录</button></div></header>
    {!cwd ? <div className="tutorloop-notice">请先打开一个带工作目录的会话，TutorLoop 会在该工作区保存学习记录。</div> : <>
      {profile && <div className="tutorloop-row"><strong data-tutorloop-content>{profile.name}</strong><span data-tutorloop-content>{profile.goal}</span><span className="tutorloop-badge">每天 {profile.daily_minutes} 分钟</span><span className="tutorloop-badge">{overview?.attempts ?? 0} 次记录 · {overview?.sources ?? 0} 个资料片段</span></div>}
      {error && <div role="alert" className="tutorloop-error"><p>{error}</p><details><summary>首次使用与运行帮助</summary><p>只需初始化一次运行环境，然后刷新或重启 DSH。无需启动 Streamlit，也不必另配模型密钥或强制填写 Python 路径。</p><p>初始化：<code>dsh-tutorloop setup</code></p><p>源码目录也可运行：<code>node scripts/cli.mjs setup</code></p><p>如果工作区尚未确认，请先在当前会话发送一条聊天消息，再刷新面板。</p></details></div>}
      {notice && <p role="status" className="tutorloop-notice">{notice}</p>}
      <nav className="tutorloop-tabs" aria-label="学习面板">{['练习', '资料', '方法', '目标'].map(name => <button key={name} aria-selected={tab === name} disabled={busy} onClick={() => name === '方法' ? loadCards() : setTab(name)}>{name}</button>)}</nav>
      {busy && <p role="status" className="tutorloop-muted">正在处理…</p>}
      {tab === '练习' && <>
        <section className="tutorloop-card"><h2>开始一个小任务</h2>{(choices.length || overview?.workspace_choices?.length) ? <><label>练习<select value={seed} onChange={e => setSeed(e.target.value)}><option value="">请选择一题</option>{Boolean(overview?.workspace_choices?.length) && <optgroup label="本工作区（导师创建）">{overview.workspace_choices.map(item => <option key={item.id} value={item.id}>{item.skill} · {String(item.stem || '').slice(0, 24)}</option>)}</optgroup>}{Boolean(choices.length) && <optgroup label="内置示例">{choices.map(item => <option key={item.id} value={item.id}>{item.subject} · {item.skill}</option>)}</optgroup>}</select></label><label>方式<select value={mode} onChange={e => setMode(e.target.value)}><option value="coach">陪练：可提示与示范</option><option value="exam">自测：交卷后讲解</option></select></label><button className="tutorloop-primary" disabled={busy || !seed || pending} onClick={() => startPractice(seed)}>开始练习</button></> : <p>还没有练习。可以回到聊天，让 DSH 根据你的学习目标与已有资料创建一题。</p>}<p className="tutorloop-muted">仅显示与档案科目匹配的内置示例；当前主题的练习请导师基于资料创建，随后出现在“本工作区”分组。自编与 AI 练习均需核对。</p></section>
        {quiz?.active && <section className="tutorloop-card" aria-label="整卷进行中"><div className="tutorloop-row"><h2>{quiz.title || '整卷进行中'}</h2><span className="tutorloop-badge">第 {Math.min((quiz.index ?? 0) + 1, quiz.total ?? 0)} / {quiz.total} 题</span></div><div className="tutorloop-row"><button className="tutorloop-primary" disabled={busy || quiz.finished} onClick={() => quizAction('zhenti_next')}>{quiz.finished ? '已完成' : '下一题 →'}</button><button disabled={busy} onClick={() => quizAction('zhenti_quit', {}, () => setQuiz(null))}>结束并保留记录</button><button disabled={busy} onClick={() => quizAction('zhenti_report', {}, r => setQuizReport(r))}>查看报告</button></div><p className="tutorloop-muted">逐题作答后点“下一题”；单选题提交即自动判分，主观题按一键批改流程。完成后报告给出正确率与错题清单。</p></section>}
        {quizReport && <PaperReport report={quizReport} language={language} busy={busy} onOpenExercise={openExercise} />}
        <section className="tutorloop-card" aria-label="真题与整卷"><h2>真题与整卷</h2><div className="tutorloop-row"><button disabled={busy || !cwd} onClick={loadZhenti}>载入真题列表</button>{zhenti && <span className="tutorloop-muted">{zhenti.papers?.length ?? 0} 套卷可选</span>}</div>
          {zhenti && (zhenti.papers?.length ? <>
            <label>试卷<select value={zhentiPaperId} disabled={busy} onChange={e => { setZhentiPaperId(e.target.value); openPaperQuestions(e.target.value) }}><option value="">请选择试卷</option>{(zhenti.papers || []).map(p => <option key={p.paper_id} value={p.paper_id}>{p.subject}·{p.kind === '真题卷' ? '真题' : '模考'}·{p.year || ''} {p.name.slice(0, 26)}（{p.count}题）</option>)}</select></label>
            <div className="tutorloop-row"><button className="tutorloop-primary" disabled={busy || !zhentiPaperId} onClick={() => { setQuizReport(null); quizAction('zhenti_start_quiz', { paper_id: Number(zhentiPaperId), mode }) }}>开始整卷</button><span className="tutorloop-muted">整卷逐题作答，行测单选自动判分。</span></div>
            {paperQ && <label>题目<select value={zhentiQSeed} disabled={busy} onChange={e => setZhentiQSeed(e.target.value)}><option value="">请选择一题（共 {paperQ.questions.length} 题）</option>{paperQ.questions.map(q => <option key={q.seed} value={q.seed} disabled={!q.ok}>{q.no}. {q.skill}（{q.t === 'single' ? '单选' : '主观'}）</option>)}</select></label>}
            {zhentiQSeed && <div className="tutorloop-row"><button disabled={busy || pending} onClick={() => startPractice(zhentiQSeed)}>练习这题</button></div>}
            <div className="tutorloop-row"><select aria-label="组卷科目" value={mixSubject} onChange={e => { setMixSubject(e.target.value); setMixSkill('') }}><option value="行测">行测</option><option value="申论">申论</option></select><select aria-label="组卷考点" value={mixSkill} onChange={e => setMixSkill(e.target.value)}><option value="">全部考点</option>{(zhenti.skills?.[mixSubject] || []).map(s => <option key={s} value={s}>{s}</option>)}</select><input aria-label="抽题数量" type="number" min="1" max="50" value={mixCount} onChange={e => setMixCount(e.target.value)} style={{ width: 72 }} /><button disabled={busy} onClick={() => { setQuizReport(null); quizAction('zhenti_start_quiz', { subject: mixSubject, skill: mixSkill || null, count: Number(mixCount) || 10, mode }) }}>随机开练</button></div>
            <p className="tutorloop-muted">题目来自工作区已导入的真题解析文件；选项与答案已核验对齐，机构解析仅供参考。</p>
          </> : <p className="tutorloop-muted">此工作区没有兼容的本地题库。你可以使用已有资料，请导师按当前学习目标创建练习。</p>)}
        </section>
        {question && <section key={exercise.id} className="tutorloop-card" aria-label="当前练习"><div className="tutorloop-row"><h2>{question.skill || question.subject || '当前练习'}</h2><span className="tutorloop-badge">{exercise.mode === 'exam' ? '自测' : '陪练'}</span></div>
          <MaterialPassages materials={exercise.materials} language={language} onAssetState={onAssetState} />
          {!exercise.materials?.length && <div className="tutorloop-material"><RichContent blocks={question.material_blocks} text={question.material} onAssetState={onAssetState} language={language} /></div>}
          <p><strong><RichContent blocks={question.stem_blocks} text={question.stem} onAssetState={onAssetState} language={language} /></strong></p>
          {question.question_type !== 'single_choice' && <small>不超过 {question.word_limit}{question.length_unit === 'words' ? ' 个词' : ' 字'}</small>}
          {question.rubric_status === 'uncalibrated' && <div className="tutorloop-notice"><p>本题尚无确认的分项量表，可先练习并获得定性反馈。</p>
            {!attempts.length && <button disabled={busy} onClick={requestRubric}>请导师准备评分标准</button>}
          </div>}
          {visualRequired && <div className="tutorloop-notice">
            {imageInfo.unsupported || question.visual_supported === false ? <p role="alert">本题含暂不支持的图像，请回看原件；当前不能正常交卷。</p>
              : imageInfo.urls.some(url => imageStates[url] === 'error') ? <p role="alert">图片加载失败，请检查网络并重新打开练习。图片不完整时不能交卷。</p>
                : !visualsLoaded ? <p>正在加载题目图像，完成后请确认内容完整。</p> : null}
            <label className="tutorloop-option"><input type="checkbox" checked={visualConfirmed} disabled={!visualsLoaded || busy || pending} onChange={event => setVisualConfirmed(event.target.checked)} />我已看清题干、材料和选项中的全部图像</label>
          </div>}
          <form onSubmit={submit}>
            {question.question_type === 'single_choice' ? <fieldset disabled={busy || pending}><legend>请选择一个选项</legend>
              {(question.options || []).map(option => <label className="tutorloop-option" key={option.id}><input type="radio" name={`answer-${exercise.id}`} value={option.id} checked={answer === option.id} onChange={e => setAnswer(e.target.value)} /><span>{option.id} · <RichContent blocks={option.blocks} text={option.text} onAssetState={onAssetState} language={language} /></span></label>)}
            </fieldset> : <label>你的答案<textarea value={answer} disabled={busy || pending} onChange={e => setAnswer(e.target.value)} placeholder="用自己的话写出思路…" /></label>}
            <div className="tutorloop-row"><button type="submit" className="tutorloop-primary" disabled={busy || pending || !answer.trim() || visualBlocked}>保存并提交</button>
              {exercise.mode !== 'exam' && <><button type="button" disabled={busy || pending} onClick={() => reveal('hint')}>给一个提示</button><button type="button" disabled={busy || pending} onClick={() => reveal('answer')}>看示范</button></>}
            </div>
          </form>
          {revealText && <div className="tutorloop-notice">{revealText}<p><small>本次已登记使用辅助；下一题再验证独立完成。</small></p></div>}
          {pending && <div className="tutorloop-notice"><p>这份主观答案待批改。点击下方按钮后，在聊天里粘贴发送即可批改。</p><div className="tutorloop-row"><button className="tutorloop-primary" disabled={busy} onClick={requestGrading}>请导师批改（复制请求）</button><button disabled={busy} onClick={() => run(signal => refresh(signal, exercise.id))}>我已发送，刷新批改</button></div><p><small>面板不会另开模型调用，也不会把待批改记为零分。批改完成后这里会自动更新。</small></p></div>}
        </section>}
        {attempts.length > 0 && <section><h2>作答记录</h2>{attempts.map((attempt, index) => <article className="tutorloop-card" key={attempt.id}><h3>第 {index + 1} 次作答 · {attempt.status === 'graded' ? '已反馈' : '待批改'}</h3><p className="tutorloop-material">{attempt.answer}</p>{Boolean(attempt.assisted) && <small>使用过提示、示范或修改</small>}<Feedback feedback={attempt.feedback} language={language} /></article>)}</section>}
        <section className="tutorloop-card"><h2>到期复习</h2>{overview?.due?.length ? overview.due.map(review => <div className="tutorloop-row" key={review.seed_id}><span>{review.skill}</span><button disabled={busy || pending} onClick={() => startPractice(review.seed_id)}>复习这题</button></div>) : <p className="tutorloop-muted">暂无到期任务。做完并复盘后，这里会出现复习安排。</p>}</section>
      </>}
      {tab === '目标' && <section className="tutorloop-card"><h2>你的学习目标</h2><form onSubmit={saveProfile}><label>学习名称<input required value={profileDraft.name} onChange={e => setProfileDraft({ ...profileDraft, name: e.target.value })} placeholder="如：英语阅读、国考、编程基础" /></label><label>具体目标<input required value={profileDraft.goal} onChange={e => setProfileDraft({ ...profileDraft, goal: e.target.value })} /></label><label>每天可学习的分钟数<input type="number" min="1" max="1440" required value={profileDraft.daily_minutes} onChange={e => setProfileDraft({ ...profileDraft, daily_minutes: e.target.value })} /></label><label>已有基础<textarea value={profileDraft.baseline || ''} onChange={e => setProfileDraft({ ...profileDraft, baseline: e.target.value })} /></label><div className="tutorloop-row"><button disabled={busy} type="submit">保存通用目标</button><button disabled={busy} type="button" onClick={() => saveProfile(null, 'gongkao')}>使用国考副省级预设</button></div></form><p className="tutorloop-muted">TutorLoop 按你提供的基础和实际作答调整教学，不默认年级或能力。</p></section>}
      {tab === '资料' && <>
        <section className="tutorloop-card"><h2>导入本地资料</h2><label>当前工作区内的文件或文件夹路径<input value={path} onChange={e => setPath(e.target.value)} placeholder="如：materials/lesson.pdf" /></label><div className="tutorloop-row"><button disabled={busy || !path.trim()} onClick={() => materialAction('import_file', { path })}>导入文件</button><button disabled={busy || !path.trim()} onClick={() => materialAction('import_folder', { path })}>导入文件夹</button></div><p className="tutorloop-muted">支持的文件由本地导入器检查。扫描件、图形与复杂表格需要回看原件，机构解析不是官方答案。</p></section>
        <section className="tutorloop-card"><h2>查找公开资料</h2><form onSubmit={e => { e.preventDefault(); materialAction('search_materials', { query, limit: 3 }) }}><label>搜索词<input value={query} onChange={e => setQuery(e.target.value)} /></label><button disabled={busy || !query.trim()}>搜索并收录</button></form><form onSubmit={e => { e.preventDefault(); materialAction('fetch_material', { url }) }}><label>原文 URL<input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" /></label><button disabled={busy || !url.trim()}>读取网页</button></form><p className="tutorloop-muted">搜索摘要与网页全文会分别标记，无法抓取时不补造正文。</p></section>
        {materialResult && <section className="tutorloop-card"><h3>本次处理</h3>{(materialResult.errors || []).map((item, i) => <p key={`error-${i}`}>{typeof item === 'string' ? item : item.message || item.error || '部分资料未导入，请检查文件。'}</p>)}{(materialResult.statuses || []).map((item, i) => <p key={`status-${i}`}>{typeof item === 'string' ? item : item.message || item.status}</p>)}</section>}
        <section className="tutorloop-card"><h2>已收录来源 · {overview?.sources ?? sources.length}</h2>{sources.length ? sources.map((source, index) => <article key={`${source.id}-${index}`}><h3>{source.title || '未命名来源'}</h3><p><small>{source.locator} · {source.kind === 'web_snippet_only' ? '搜索摘要，非全文' : source.kind === 'synthetic_case' ? '自编材料' : source.kind === 'web_fulltext' ? '网页全文' : '本地材料'}</small></p>{source.url && /^https?:\/\//i.test(source.url) && <a href={source.url} target="_blank" rel="noreferrer">查看原始来源</a>}</article>) : <p className="tutorloop-muted">还没有收录资料。导入一份与你的目标相关的材料，再回聊天开始学习。</p>}</section>
      </>}
      {tab === '方法' && <section><h2>把方法拆成一个动作</h2><p className="tutorloop-muted">以下是教学整理，以国考示例为主，不是官方评分标准。</p>{cards.map(card => <details className="tutorloop-card" key={card.id}><summary>{card.subject} · {card.title}</summary><ol>{(card.steps || []).map((step, index) => <li key={index}>{step}</li>)}</ol><p><strong>例子：</strong>{card.example}</p><p><strong>容易误判：</strong>{card.pitfall}</p><p><strong>下一步：</strong>{card.next_action}</p><small>{card.source_note}</small></details>)}</section>}
    </>}
  </div></div>, language)
}

export function apply(ctx) {
  ctx.effect(() => mountStyles(), 'dsh-tutorloop: native styles')
  ctx.effect(() => {
    const dispose = ctx.slots.inject('conversation.view', () => ctx.slots.register({ name: 'conversation.view', id: 'tutorloop', order: 30, label: () => 'TutorLoop' }, props => <ConversationTutorLoop {...props} />))
    return () => dispose?.()
  }, 'dsh-tutorloop: conversation view')
}
