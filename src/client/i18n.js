import React from 'react'

export function detectLanguage(doc = globalThis.document) {
  const language = doc?.documentElement?.lang || 'zh'
  return /^zh/i.test(language) ? 'zh' : 'en'
}

const english = {
  '定性反馈：本题尚无确认的分项量表，不计数值成绩。': 'Qualitative feedback: no confirmed rubric yet, so no numerical score is assigned.',
  '定性反馈': 'Qualitative feedback', '材料依据：': 'Source evidence: ',
  '这里仅展示已指定的学生材料，教师参考资料单独保存。': 'Only designated student materials are shown here. Teacher references are kept separately.',
  '这份资料经过文字提取，图形、表格与段落顺序请对照原件核对。': 'This material was extracted as text. Check figures, tables, and paragraph order against the original.',
  '已提交 ': 'Submitted ', ' · 已评分 ': ' · Scored ', ' · 正确 ': ' · Correct ', ' · 正确率 ': ' · Accuracy ', ' · 待批改 ': ' · Pending ',
  '回看': 'Review', '回看这题': 'Review this item',
  '仅统计本轮作答；正确率只计有数值评分的题目，定性反馈与待批改不计入。': 'Only this round is counted. Accuracy includes numerically scored items; qualitative and pending feedback are excluded.',
  '本题尚无确认的分项量表，可先练习并获得定性反馈。': 'This item has no confirmed rubric yet. You can practice and receive qualitative feedback.',
  '请导师准备评分标准': 'Ask tutor to prepare the rubric',
  '本题含暂不支持的图像，请回看原件；当前不能正常交卷。': 'This item contains unsupported images. Review the original; submission is currently unavailable.',
  '图片加载失败，请检查网络并重新打开练习。图片不完整时不能交卷。': 'An image failed to load. Check your connection and reopen the practice. Submission requires complete images.',
  '正在加载题目图像，完成后请确认内容完整。': 'Loading question images. Confirm they are complete once loaded.',
  '我已看清题干、材料和选项中的全部图像': 'I can clearly see every image in the question, materials, and options',
  ' 个词': ' words', '请导师批改（复制请求）': 'Ask tutor to review (copy request)',
  '请求已复制。已切回聊天，粘贴并发送即可。': 'Request copied. Paste and send it in chat.',
  '答案已保存。点击“请导师批改”复制请求，再回聊天粘贴发送。': 'Answer saved. Use “Ask tutor to review” to copy the request, then paste and send it in chat.',
  '已完成': 'Finished', '整卷逐题作答，行测单选自动判分。': 'Work through the paper one item at a time. Valid multiple-choice items are graded on submission.',
  '跟随 DSH': 'Follow DSH',
  '一次解决一个问题，练习后再验证。': 'One question at a time. Practice, then check your understanding.',
  '刷新记录': 'Refresh', '练习': 'Practice', '资料': 'Materials', '方法': 'Methods', '目标': 'Goals',
  '每天 ': 'Daily ', ' 分钟': ' min', ' 次记录 · ': ' attempts · ', ' 个资料片段': ' source excerpts',
  '正在处理…': 'Working…', '开始一个小任务': 'Start a small task', '请选择一题': 'Choose a practice question',
  '方式': 'Mode', '陪练：可提示与示范': 'Coaching: hints and examples', '自测：交卷后讲解': 'Self-test: explanations after submission',
  '开始练习': 'Start practice', '还没有练习。可以回到聊天，让 DSH 根据你的学习目标与已有资料创建一题。': 'No practice yet. Ask DSH in chat to create a question using your goal and materials.',
  '内置练习以国考为主；其他主题可在聊天中请当前模型创建。自编与 AI 练习均需核对。': 'Included examples focus on Chinese civil-service exams. Ask your current model in chat for other subjects. Review authored and AI-generated questions.',
  '当前练习': 'Current practice', '自测': 'Self-test', '陪练': 'Coaching', '不超过 ': 'Limit: ', ' 字': ' characters',
  '请选择一个选项': 'Choose one option', '你的答案': 'Your answer', '用自己的话写出思路…': 'Explain your reasoning in your own words…',
  '保存并提交': 'Save and submit', '给一个提示': 'Get a hint', '看示范': 'Show an example',
  '本次已登记使用辅助；下一题再验证独立完成。': 'Assistance is recorded for this attempt. Check independent performance on another question.',
  '这份主观答案待批改。点击下方按钮后，在聊天里粘贴发送即可批改。': 'This written answer is awaiting feedback. Use the button below, then paste and send the copied request in chat.',
  '请导师批改（已复制请求）': 'Ask tutor to review (request copied)', '我已发送，刷新批改': 'Sent. Refresh feedback',
  '面板不会另开模型调用，也不会把待批改记为零分。批改完成后这里会自动更新。': 'The panel makes no separate model call and never scores a pending answer as zero. This view updates itself once the review lands.',
  '批改请求已复制。已切回聊天，粘贴并发送即可。': 'Review request copied. Chat is now open — paste and send it.',
  '批改已完成，反馈已更新。': 'Review finished. Feedback updated.',
  '答案已保存。点击“请导师批改”，请求已自动复制，回聊天粘贴发送即可。': 'Answer saved. Use “Ask tutor to review”; the request is copied — paste and send it in chat.',
  '材料原文 · ': 'Materials · ', ' 段 · 约 ': ' passages · about ',
  '材料原文仅作题面依据；答案与评分点不会在此展示。': 'Passages are shown for reading only. Answers and grading points are never displayed here.',
  '维度': 'Dimension', '得分': 'Score', '反馈': 'Feedback', '分项得分': 'Criteria scores',
  '遗漏要点': 'Missed points', '材料外推断': 'Claims beyond the material',
  '真题与整卷': 'Real exams & papers', '载入真题列表': 'Load exam list', ' 套卷可选': ' papers available',
  '试卷': 'Paper', '请选择试卷': 'Choose a paper', '开始整卷': 'Start full paper', '题目': 'Question',
  '请选择一题（共 ': 'Choose one (', ' 题）': ' items)', '练习这题': 'Practice this one',
  '组卷科目': 'Mix subject', '组卷考点': 'Mix topic', '抽题数量': 'Count', '随机开练': 'Random practice',
  '全部考点': 'All topics', '单选': 'choice', '主观': 'written',
  '整卷进行中': 'Paper in progress', '下一题 →': 'Next →', '结束并保留记录': 'End and keep records', '查看报告': 'View report',
  '逐题作答后点“下一题”；单选题提交即自动判分，主观题按一键批改流程。完成后报告给出正确率与错题清单。': 'Answer each item then press Next. Choice questions are graded on submit; written answers follow the one-click review flow. A report with accuracy follows.',
  '整卷报告': 'Paper report', '逐题结果': 'Per-item results', '题号': 'No.', '考点': 'Topic', '结果': 'Result', '你的作答': 'Your answer',
  '未作答': 'Unanswered', '待批改': 'Awaiting feedback',
  '题目来自工作区已导入的真题解析文件；选项与答案已核验对齐，机构解析仅供参考。': 'Items come from locally verified exam solution files. Options and answers are aligned; publisher explanations are for reference only.',
  '本工作区（导师创建）': 'This workspace (tutor-created)', '内置示例': 'Built-in examples',
  '此工作区没有兼容的本地题库。你可以使用已有资料，请导师按当前学习目标创建练习。': 'No compatible local question bank in this workspace. Ask your tutor to create exercises from your materials and learning goals.',
  '仅显示与档案科目匹配的内置示例；当前主题的练习请导师基于资料创建，随后出现在“本工作区”分组。自编与 AI 练习均需核对。': 'Built-in examples are filtered by your profile subjects. Ask your tutor to create exercises from your materials; they then appear under “This workspace”. Review authored and AI-generated questions.',
  '结果为教学参考；真题答案与解析来自本地已核验的机构解析文件，不代表官方评分。': 'Results are instructional. Answers and explanations come from locally verified publisher files, not official grading.',
  '回到聊天': 'Return to chat', '面板不会另开模型调用，也不会把待批改记为零分。聊天批改完成后刷新记录。': 'The panel does not make a separate model call or score a pending answer as zero. Refresh after your chat model finishes the review.',
  '答案已保存。请回到聊天，让 DSH 的当前模型按本题材料批改。': 'Answer saved. Return to chat for feedback from your current DSH model using this question’s materials.',
  '作答已记录，下面可查看反馈。': 'Answer recorded. Review your feedback below.',
  '作答记录': 'Your attempts', '第 ': 'Attempt ', ' 次作答 · ': ' · ', '已反馈': 'Reviewed',
  '使用过提示、示范或修改': 'Used hints, examples, or revisions', '到期复习': 'Due for review', '复习这题': 'Review this question',
  '暂无到期任务。做完并复盘后，这里会出现复习安排。': 'Nothing due yet. Review schedules appear here after practice and feedback.',
  '本次反馈': 'Feedback', '教学参考分：': 'Practice score: ', ' / ': ' / ', ' · 非官方评分': ' · not an official grade',
  '你的原句：': 'Your words: ', '改写示范': 'Example revision',
  '你的学习目标': 'Your learning goal', '学习名称': 'Learning title', '具体目标': 'Specific goal',
  '每天可学习的分钟数': 'Available minutes per day', '已有基础': 'Starting point', '保存通用目标': 'Save learning goal',
  '使用国考副省级预设': 'Use Chinese civil-service exam preset', '如：英语阅读、国考、编程基础': 'e.g. English reading, exam preparation, programming',
  'TutorLoop 按你提供的基础和实际作答调整教学，不默认年级或能力。': 'TutorLoop adapts to your starting point and actual answers, without assuming a grade level or ability.',
  '学习目标已保存；已开始的练习保留原来的学习档案。': 'Goal saved. Existing practice keeps its original learning profile.',
  '导入本地资料': 'Import local materials', '当前工作区内的文件或文件夹路径': 'File or folder path inside this workspace',
  '如：materials/lesson.pdf': 'e.g. materials/lesson.pdf', '导入文件': 'Import file', '导入文件夹': 'Import folder',
  '支持的文件由本地导入器检查。扫描件、图形与复杂表格需要回看原件，机构解析不是官方答案。': 'The local importer checks supported files. Scans, figures, and complex tables need review against the original. Publisher explanations are not official answers.',
  '查找公开资料': 'Find public materials', '搜索词': 'Search terms', '搜索并收录': 'Search and collect', '原文 URL': 'Source URL',
  '读取网页': 'Read webpage', '搜索摘要与网页全文会分别标记，无法抓取时不补造正文。': 'Search snippets and full webpages are labeled separately. Missing text is never invented.',
  '本次处理': 'Import results', '部分资料未导入，请检查文件。': 'Some materials could not be imported. Check the files.',
  '已收录来源 · ': 'Collected sources · ', '未命名来源': 'Untitled source', '搜索摘要，非全文': 'Search snippet, not full text',
  '自编材料': 'Authored example', '网页全文': 'Full webpage', '本地材料': 'Local material', '查看原始来源': 'Open original source',
  '还没有收录资料。导入一份与你的目标相关的材料，再回聊天开始学习。': 'No materials collected yet. Import something relevant to your goal, then return to chat to start learning.',
  '把方法拆成一个动作': 'Turn a method into one action', '以下是教学整理，以国考示例为主，不是官方评分标准。': 'These teaching notes mainly use Chinese exam examples. They are not official grading standards.',
  '例子：': 'Example: ', '容易误判：': 'Common pitfall: ', '下一步：': 'Next action: ',
  '学习面板': 'Learning panel', '请先打开一个带工作目录的会话，TutorLoop 会在该工作区保存学习记录。': 'Open a conversation with a workspace first. TutorLoop saves learning records in that workspace.',
  '请先打开一个带工作目录的会话。': 'Open a conversation with a workspace first.', '面板不支持此操作。': 'This action is not available in the student panel.',
  '暂时无法连接 TutorLoop，请确认 DSH 服务正在运行后重试。': 'Cannot connect to TutorLoop. Check that DSH is running, then retry.',
  'TutorLoop 尚未就绪。请启用插件，运行 dsh-tutorloop setup 后刷新 DSH。': 'TutorLoop is not ready. Enable the plugin, run dsh-tutorloop setup once, then reload DSH.',
  '操作未完成，请检查插件配置后重试。': 'The action did not complete. Check plugin settings and retry.',
  '首次使用与运行帮助': 'First-time setup and help',
  '只需初始化一次运行环境，然后刷新或重启 DSH。无需启动 Streamlit，也不必另配模型密钥或强制填写 Python 路径。': 'Run setup once, then reload DSH. No Streamlit, extra model key, or manual Python path is required.',
  '初始化：': 'Setup: ', '源码目录也可运行：': 'From the source directory: ',
  '如果工作区尚未确认，请先在当前会话发送一条聊天消息，再刷新面板。': 'If this workspace is not confirmed yet, send one chat message in this conversation, then refresh the panel.',
}

export function translate(text, language) {
  if (language !== 'en' || typeof text !== 'string') return text
  if (Object.hasOwn(english, text)) return english[text]
  const collected = /^资料处理完成，新增 (\d+) 个片段。请核对来源和完整性。$/.exec(text)
  if (collected) return `Materials processed: ${collected[1]} new excerpts. Check sources and completeness.`
  const copyFailed = /^复制失败，请手动复制：“(.+)”$/.exec(text)
  return copyFailed ? `Copy failed. Copy this manually: “${copyFailed[1]}”` : text
}

/** Translate only our known UI literals, never arbitrary material or backend text. */
export function localize(node, language) {
  if (typeof node === 'string') return translate(node, language)
  if (Array.isArray(node)) return React.Children.map(node, child => localize(child, language))
  if (!React.isValidElement(node)) return node
  if (node.props['data-tutorloop-content'] || node.props.className?.split(' ').includes('tutorloop-material')) return node
  const props = {}
  for (const name of ['placeholder', 'aria-label', 'title']) {
    if (typeof node.props[name] === 'string') props[name] = translate(node.props[name], language)
  }
  if (Object.hasOwn(node.props, 'children')) props.children = localize(node.props.children, language)
  return React.cloneElement(node, props)
}
