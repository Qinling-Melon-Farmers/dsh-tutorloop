import React, { useEffect, useRef, useState } from 'react'
import { studentAction, items, value } from './api.js'
import { mountStyles } from './styles.js'
import { detectLanguage, localize } from './i18n.js'

export const inject = ['slots']

export function ConversationTutorLoop({ sessionId, useSessions, viewRequest, completeViewRequest, openView }) {
  const cwd = useSessions(snapshot => snapshot.byId[sessionId]?.cwd ?? '')
  useEffect(() => { if (viewRequest?.view === 'tutorloop') completeViewRequest?.() }, [viewRequest, completeViewRequest])
  return <TutorLoopPanel key={cwd} cwd={cwd} openChat={() => openView?.('chat', '')} />
}

function Feedback({ feedback, language }) {
  if (!feedback) return null
  return localize(<div className="tutorloop-card"><h3>本次反馈</h3><p>教学参考分：{feedback.score} / {feedback.max_score} · 非官方评分</p>
    <p>{feedback.next_skill}：{feedback.next_exercise_instruction}</p>
    {Boolean(feedback.criteria?.length) && <table className="tutorloop-table"><caption className="tutorloop-sr-only">分项得分</caption><thead><tr><th scope="col">维度</th><th scope="col">得分</th><th scope="col">反馈</th></tr></thead><tbody>{feedback.criteria.map(item => <tr key={item.name}><th scope="row">{item.name}</th><td>{item.awarded}/{item.max_points}</td><td>{item.feedback}{item.student_span && <><br /><small>你的原句：{item.student_span}</small></>}</td></tr>)}</tbody></table>}
    {Boolean(feedback.omissions?.length) && <div className="tutorloop-warning"><strong>遗漏要点</strong><ul>{feedback.omissions.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
    {Boolean(feedback.unsupported_claims?.length) && <div className="tutorloop-warning"><strong>材料外推断</strong><ul>{feedback.unsupported_claims.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
    <p>{feedback.organization_feedback}</p><details><summary>改写示范</summary><p>{feedback.improved_answer}</p></details></div>, language)
}

/** 卷面视图:材料原文折叠区。长材料默认收起,保持题干可见;材料文本永不翻译。 */
function MaterialPassages({ materials, language }) {
  const list = materials || []
  if (!list.length) return null
  const totalChars = list.reduce((sum, m) => sum + (m.text?.length || 0), 0)
  return localize(<details className="tutorloop-card" open={totalChars <= 400}><summary>材料原文 · {list.length} 段 · 约 {totalChars} 字</summary>
    {list.map((m, index) => <article key={m.id || index}><h4 data-tutorloop-content>{m.title || m.locator || `材料 ${index + 1}`}</h4><p className="tutorloop-material" data-tutorloop-content>{m.text}</p>{m.url && /^https?:\/\//i.test(m.url) && <a href={m.url} target="_blank" rel="noreferrer">查看原始来源</a>}</article>)}
    <p><small>材料原文仅作题面依据;答案与评分点不会在此展示。</small></p></details>, language)
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

  async function refresh(signal) {
    const [nextOverview, nextStudent, nextSources, nextQuiz] = await Promise.all([
      studentAction(cwd, 'overview', {}, signal), studentAction(cwd, 'student_state', {}, signal), studentAction(cwd, 'list_sources', {}, signal),
      studentAction(cwd, 'zhenti_quiz_state', {}, signal).catch(() => ({ active: false })),
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
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    const aborter = new AbortController(); controller.current = aborter
    try { await task(aborter.signal) } catch (e) { if (e.name !== 'AbortError' && active.current) setError(e.message) }
    finally { if (active.current) setBusy(false) }
  }

  const exercise = student?.exercise || overview?.current_exercise
  const attempts = student?.attempts || []
  const question = exercise?.question
  const pending = attempts.some(a => a.status === 'pending')
  const choices = overview?.seed_choices || []
  const profile = overview?.learning_profile || student?.learning_profile
  useEffect(() => { setAnswer(''); setRevealText(''); submission.current = null }, [exercise?.id])

  // 批改自动回流:待批改期间轻量轮询,聊天模型批改完自动更新面板;面板重新可见时也刷新。
  const pendingRef = useRef(false)
  useEffect(() => { pendingRef.current = pending }, [pending])
  useEffect(() => {
    if (!cwd || !pending) return
    const timer = setInterval(() => {
      if (!active.current || document.hidden) return
      studentAction(cwd, 'overview', {}).then(state => {
        if (!active.current || state.pending) return
        setNotice('批改已完成，反馈已更新。')
        run(signal => refresh(signal))
      }).catch(() => { /* transient poll failures retry on the next tick */ })
    }, 15000)
    return () => clearInterval(timer)
  }, [cwd, pending])
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
    if (!answer.trim() || !exercise) return
    await run(async signal => {
      const signature = `${exercise.id}:${answer}`
      if (submission.current?.signature !== signature) submission.current = { signature, id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}` }
      const result = await studentAction(cwd, 'submit_answer', { exercise_id: exercise.id, answer, submission_id: submission.current.id, expected_version: exercise.version }, signal)
      await refresh(signal)
      if (active.current) setNotice(result.status === 'pending' ? '答案已保存。点击“请导师批改”，请求已自动复制，回聊天粘贴发送即可。' : '作答已记录，下面可查看反馈。')
    })
  }

  const GRADE_REQUEST = '请读取 TutorLoop 当前练习，按材料批改我刚提交的答案。'

  async function requestGrading() {
    let copied = false
    try { await navigator.clipboard?.writeText(GRADE_REQUEST); copied = true } catch { /* clipboard may be unavailable without focus */ }
    setNotice(copied ? '批改请求已复制。已切回聊天，粘贴并发送即可。' : `复制失败，请手动复制：“${GRADE_REQUEST}”`)
    openChat?.()
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

  return localize(<div className="tutorloop-panel" data-dsh-plugin="tutorloop" data-dsh-part="conversation-view" lang={language === 'zh' ? 'zh-CN' : 'en'}><div className="tutorloop-content">
    <header className="tutorloop-header"><div><h1>TutorLoop</h1><p className="tutorloop-muted">一次解决一个问题，练习后再验证。</p></div><div className="tutorloop-row"><select aria-label="Language / 语言" disabled={!languageReady || !cwd} value={languageMode} onChange={e => setLanguageMode(e.target.value)}><option value="zh">中文</option><option value="en">English</option><option value="auto">跟随 DSH</option></select><button disabled={busy || !cwd} onClick={() => run(signal => refresh(signal))}>刷新记录</button></div></header>
    {!cwd ? <div className="tutorloop-notice">请先打开一个带工作目录的会话，TutorLoop 会在该工作区保存学习记录。</div> : <>
      {profile && <div className="tutorloop-row"><strong data-tutorloop-content>{profile.name}</strong><span data-tutorloop-content>{profile.goal}</span><span className="tutorloop-badge">每天 {profile.daily_minutes} 分钟</span><span className="tutorloop-badge">{overview?.attempts ?? 0} 次记录 · {overview?.sources ?? 0} 个资料片段</span></div>}
      {error && <div role="alert" className="tutorloop-error"><p>{error}</p><details><summary>首次使用与运行帮助</summary><p>只需初始化一次运行环境，然后刷新或重启 DSH。无需启动 Streamlit，也不必另配模型密钥或强制填写 Python 路径。</p><p>初始化：<code>dsh-tutorloop setup</code></p><p>源码目录也可运行：<code>node scripts/cli.mjs setup</code></p><p>如果工作区尚未确认，请先在当前会话发送一条聊天消息，再刷新面板。</p></details></div>}
      {notice && <p role="status" className="tutorloop-notice">{notice}</p>}
      <nav className="tutorloop-tabs" aria-label="学习面板">{['练习', '资料', '方法', '目标'].map(name => <button key={name} aria-selected={tab === name} disabled={busy} onClick={() => name === '方法' ? loadCards() : setTab(name)}>{name}</button>)}</nav>
      {busy && <p role="status" className="tutorloop-muted">正在处理…</p>}
      {tab === '练习' && <>
        <section className="tutorloop-card"><h2>开始一个小任务</h2>{(choices.length || overview?.workspace_choices?.length) ? <><label>练习<select value={seed} onChange={e => setSeed(e.target.value)}><option value="">请选择一题</option>{Boolean(overview?.workspace_choices?.length) && <optgroup label="本工作区（导师创建）">{overview.workspace_choices.map(item => <option key={item.id} value={item.id}>{item.skill} · {String(item.stem || '').slice(0, 24)}</option>)}</optgroup>}{Boolean(choices.length) && <optgroup label="内置示例">{choices.map(item => <option key={item.id} value={item.id}>{item.subject} · {item.skill}</option>)}</optgroup>}</select></label><label>方式<select value={mode} onChange={e => setMode(e.target.value)}><option value="coach">陪练：可提示与示范</option><option value="exam">自测：交卷后讲解</option></select></label><button className="tutorloop-primary" disabled={busy || !seed || pending} onClick={() => startPractice(seed)}>开始练习</button></> : <p>还没有练习。可以回到聊天，让 DSH 根据你的学习目标与已有资料创建一题。</p>}<p className="tutorloop-muted">内置示例覆盖多个学科；当前主题的练习请导师在聊天里创建，创建后出现在“本工作区”分组。自编与 AI 练习均需核对。</p></section>
        {quiz?.active && <section className="tutorloop-card" aria-label="整卷进行中"><div className="tutorloop-row"><h2>{quiz.title || '整卷进行中'}</h2><span className="tutorloop-badge">第 {Math.min((quiz.index ?? 0) + 1, quiz.total ?? 0)} / {quiz.total} 题</span></div><div className="tutorloop-row"><button className="tutorloop-primary" disabled={busy} onClick={() => quizAction('zhenti_next')}>{quiz.finished ? '已完成' : '下一题 →'}</button><button disabled={busy} onClick={() => quizAction('zhenti_quit', {}, () => setQuiz(null))}>结束并保留记录</button><button disabled={busy} onClick={() => quizAction('zhenti_report', {}, r => setQuizReport(r))}>查看报告</button></div><p className="tutorloop-muted">逐题作答后点“下一题”；单选题提交即自动判分，主观题按一键批改流程。完成后报告给出正确率与错题清单。</p></section>}
        {quizReport && <section className="tutorloop-card" aria-label="整卷报告"><div className="tutorloop-row"><h2>{quizReport.title}</h2><span className="tutorloop-badge">正确 {quizReport.correct}/{quizReport.answered}{quizReport.accuracy != null ? ` · ${Math.round(quizReport.accuracy * 100)}%` : ''}{quizReport.pending ? ` · 待批改 ${quizReport.pending}` : ''}</span></div>{Boolean(quizReport.items?.length) && <table className="tutorloop-table"><caption className="tutorloop-sr-only">逐题结果</caption><thead><tr><th scope="col">题号</th><th scope="col">考点</th><th scope="col">结果</th><th scope="col">你的作答</th></tr></thead><tbody>{quizReport.items.map(item => <tr key={item.seed}><td>{item.no}</td><td data-tutorloop-content>{item.skill}</td><td>{item.status === 'graded' ? (item.score >= 8 && !item.status_pending ? `✓ ${item.score}/10` : `${item.score ?? '-'}/10`) : item.status === 'pending' ? '待批改' : '未作答'}</td><td data-tutorloop-content>{String(item.answer ?? '').slice(0, 40)}</td></tr>)}</tbody></table>}<p><small>结果为教学参考；真题答案与解析来自本地已核验的机构解析文件，不代表官方评分。</small></p></section>}
        <section className="tutorloop-card" aria-label="真题与整卷"><h2>真题与整卷</h2><div className="tutorloop-row"><button disabled={busy || !cwd} onClick={loadZhenti}>载入真题列表</button>{zhenti && <span className="tutorloop-muted">{zhenti.papers?.length ?? 0} 套卷可选</span>}</div>
          {zhenti && (zhenti.papers?.length ? <>
            <label>试卷<select value={zhentiPaperId} disabled={busy} onChange={e => { setZhentiPaperId(e.target.value); openPaperQuestions(e.target.value) }}><option value="">请选择试卷</option>{(zhenti.papers || []).map(p => <option key={p.paper_id} value={p.paper_id}>{p.subject}·{p.kind === '真题卷' ? '真题' : '模考'}·{p.year || ''} {p.name.slice(0, 26)}（{p.count}题）</option>)}</select></label>
            <div className="tutorloop-row"><button className="tutorloop-primary" disabled={busy || !zhentiPaperId} onClick={() => { setQuizReport(null); quizAction('zhenti_start_quiz', { paper_id: Number(zhentiPaperId) }) }}>开始整卷</button><span className="tutorloop-muted">整卷逐题作答，行测单选自动判分。</span></div>
            {paperQ && <label>题目<select value={zhentiQSeed} disabled={busy} onChange={e => setZhentiQSeed(e.target.value)}><option value="">请选择一题（共 {paperQ.questions.length} 题）</option>{paperQ.questions.map(q => <option key={q.seed} value={q.seed}>{q.no}. {q.skill}（{q.t === 'single' ? '单选' : '主观'}）</option>)}</select></label>}
            {zhentiQSeed && <div className="tutorloop-row"><button disabled={busy || pending} onClick={() => startPractice(zhentiQSeed)}>练习这题</button></div>}
            <div className="tutorloop-row"><select aria-label="组卷科目" value={mixSubject} onChange={e => { setMixSubject(e.target.value); setMixSkill('') }}><option value="行测">行测</option><option value="申论">申论</option></select><select aria-label="组卷考点" value={mixSkill} onChange={e => setMixSkill(e.target.value)}><option value="">全部考点</option>{(zhenti.skills?.[mixSubject] || []).map(s => <option key={s} value={s}>{s}</option>)}</select><input aria-label="抽题数量" type="number" min="1" max="50" value={mixCount} onChange={e => setMixCount(e.target.value)} style={{ width: 72 }} /><button disabled={busy} onClick={() => { setQuizReport(null); quizAction('zhenti_start_quiz', { subject: mixSubject, skill: mixSkill || null, count: Number(mixCount) || 10 }) }}>随机开练</button></div>
            <p className="tutorloop-muted">题目来自工作区已导入的真题解析文件；选项与答案已核验对齐，机构解析仅供参考。</p>
          </> : <p className="tutorloop-muted">此工作区没有本地真题库。真题库随国考备考工作区的解析文件提供，其他主题请用上方“开始一个小任务”或让导师出题。</p>)}
        </section>
        {question && <section className="tutorloop-card" aria-label="当前练习"><div className="tutorloop-row"><h2>{question.skill || question.subject || '当前练习'}</h2><span className="tutorloop-badge">{exercise.mode === 'exam' ? '自测' : '陪练'}</span></div>
          <MaterialPassages materials={exercise.materials} language={language} />
          {!exercise.materials?.length && <div className="tutorloop-material">{question.material}</div>}
          <p><strong>{question.stem}</strong></p>{question.question_type !== 'single_choice' && <small>不超过 {question.word_limit} 字</small>}
          <form onSubmit={submit}>{question.question_type === 'single_choice' ? <fieldset disabled={busy || pending}><legend>请选择一个选项</legend>{(question.options || []).map(option => <label className="tutorloop-option" key={option.id}><input type="radio" name={`answer-${exercise.id}`} value={option.id} checked={answer === option.id} onChange={e => setAnswer(e.target.value)} />{option.id} · {option.text}</label>)}</fieldset> : <label>你的答案<textarea value={answer} disabled={busy || pending} onChange={e => setAnswer(e.target.value)} placeholder="用自己的话写出思路…" /></label>}<div className="tutorloop-row"><button type="submit" className="tutorloop-primary" disabled={busy || pending || !answer.trim()}>保存并提交</button>{exercise.mode !== 'exam' && <><button type="button" disabled={busy || pending} onClick={() => reveal('hint')}>给一个提示</button><button type="button" disabled={busy || pending} onClick={() => reveal('answer')}>看示范</button></>}</div></form>
          {revealText && <div className="tutorloop-notice">{revealText}<p><small>本次已登记使用辅助；下一题再验证独立完成。</small></p></div>}
          {pending && <div className="tutorloop-notice"><p>这份主观答案待批改。点击下方按钮后，在聊天里粘贴发送即可批改。</p><div className="tutorloop-row"><button className="tutorloop-primary" onClick={requestGrading}>请导师批改（已复制请求）</button><button onClick={() => run(signal => refresh(signal))}>我已发送，刷新批改</button></div><p><small>面板不会另开模型调用，也不会把待批改记为零分。批改完成后这里会自动更新。</small></p></div>}
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
