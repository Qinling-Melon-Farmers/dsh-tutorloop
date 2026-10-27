# 更新日志 / Changelog

本文件记录面向用户的显著变化。版本依据 git tag 与提交历史核对，npm 发布状态依据 [公开 registry](https://registry.npmjs.org/dsh-tutorloop) 核对；日期使用 Asia/Shanghai（UTC+8）。完整历史见 [Releases](https://github.com/Qinling-Melon-Farmers/dsh-tutorloop/releases)。

This file records user-facing changes checked against git tags and history, with npm publication status checked against the [public registry](https://registry.npmjs.org/dsh-tutorloop). Dates use Asia/Shanghai (UTC+8). See [Releases](https://github.com/Qinling-Melon-Farmers/dsh-tutorloop/releases) for the full history.

## 0.4.1（2026-10-26）

### 中文

- 已发布 npm。包含未发布 npm 的 0.4.0 全部教学与可靠性更新，以下完整列出；另修正 Windows CI 对 8.3 临时目录别名的测试路径比较。保留 0.4.0 原 tag，不覆盖历史；本次路径修正不改变运行时代码。
- 面向自选资料的通用学习陪练：引导练习、证据反馈与间隔复习。内置示例按学习档案科目筛选，StudyHub 课程默认不再固定国考；中英教学提示与批改请求允许直接肯定正确答案并安排一次复述，不为找错增加标准。语义判断仍依赖宿主模型。
- 补齐七个真题动作的 JS bridge 白名单，教师工具增至 18 个，新增作答前 `prepare_rubric`；`find_materials` 全文检索仅供教师工具调用，学生 HTTP 路由拒绝教师检索与批改动作。
- 新题以 `student_material_ids` 显式公开学生材料，教师参考与答案不进入学生题面；隐藏无明确角色的旧来源，保留旧题干材料，不改写历史成绩。未标定主观题只给定性反馈，分项、总分和满分为 `null`，不推进掌握；数值量表必须在任何作答前确认，新反馈须引用材料与学生原句。
- 保留结构化题干、材料及选项图像，仅支持 `fb.fbstatic.cn`、`fb.fenbike.cn` 的 HTTPS 图源。必要图像缺失、加载失败或不支持时禁止正常交卷，成功加载后仍需用户确认。StudyHub 文本转换器明确拒绝图文题和未标定开放题，不丢图或伪造评分标准。
- 整卷每轮绑定独立练习实例，重做不继承旧成绩；待批改和定性结果不计数值正确率。练习创建与绑定、推进在同一事务中完成，失败回滚；无可靠轮次归属的历史整卷需重开。
- 修复大库规范化、阈值切换与词项候选召回，移除导致漏召回的旧硬上限。候选集 BM25 使用不同的语料统计，不保证与全库 BM25 排序等价。修复自定义 DB 的题库工作区定位；科目与技能来自档案或显式字段，计量区分非空白字符与词。
- 新授权按工作区独立原子写入 `~/.dsh-tutorloop/trusted-workspaces.json.d/`，只读兼容旧 JSON，避免多实例覆盖。撤销全部持久授权须删除旧 JSON 和 `.d/` 目录、移除显式 `workspacePath`（如有），再重启所有相关宿主；自定义 `trustStore` 同理。撤销不删除学习库，也不提供共享远程宿主的多租户鉴权。
- 已完成 [验收记录](https://github.com/Qinling-Melon-Farmers/dsh-tutorloop/blob/v0.4.1/docs/VALIDATION.md) 所列自动化、Windows 实际桌面与模型教学、完整宿主重启及 WSL Ubuntu 20.04 安装/后端验收。记录包括 112 项 Python、17 项真实 Python 后端 Node 测试（零跳过）、8 项发布/issue 自动化测试、构建及 36 文件包白名单；后续提示和客户端修订另有回归检查。Linux 未测试模型或图形桌面；图像成功分支包含模拟测试，也另有真实允许 CDN 图像加载记录。这些是有范围的观察，不是教学质量保证。
- 更正旧版边界：219 卷、约 2.3 万题只是当时本地索引规模，数据不随 npm 分发，也不代表全部可练；旧性能描述不代表检索等价；仅删除单个信任文件的旧方式不适用于 0.4.0 起的新存储。主观反馈仍可能误判、泄露提示或添加额外要求；并非所有写入都幂等，取消后应重读状态再重试。

### English

- Published to npm. Includes all teaching and reliability changes from 0.4.0, which was not published to npm, listed in full below. Also canonicalizes Windows CI test paths when temporary directories use 8.3 aliases. The original 0.4.0 tag is preserved; this path-test fix changes no runtime code.
- General-purpose learning from user-selected materials: guided practice, evidence-based feedback and spaced review. Filter built-in examples by profile subjects and remove the exam-specific StudyHub course default. Refine Chinese/English guidance and copied grading requests to accept correct answers and suggest one recall task without inventing extra criteria. Semantic judgment still depends on the host model.
- Connect all seven paper actions through the JS bridge; provide 18 teacher tools, including before-answer `prepare_rubric`. Restrict full-text `find_materials` retrieval to teacher tools and reject teacher retrieval/grading actions through the student HTTP route.
- Publish student sources explicitly through `student_material_ids`, keeping teacher references and answers out of student responses. Hide legacy sources without an explicit role, preserve old question passages, and leave historical scores unchanged. Uncalibrated subjective questions receive qualitative feedback with null criterion/total/maximum scores and no mastery progression. Numeric rubrics must be confirmed before any answer; new feedback must cite sources and original answer spans.
- Preserve structured question, passage and option images. Support only HTTPS images from `fb.fbstatic.cn` and `fb.fenbike.cn`; block normal submission when required images are missing, unsupported or fail to load, and require user confirmation after loading. Reject visual questions and uncalibrated open questions in StudyHub text exports rather than dropping images or inventing scoring criteria.
- Bind each paper round to its own exercise instances so retries do not inherit previous scores; exclude pending and qualitative results from numeric accuracy. Create exercises and bind/advance rounds transactionally, rolling back failures. Restart historical rounds without reliable ownership.
- Fix normalization, threshold transitions and lexical candidate recall in large libraries; remove the old hard cap that lost recall. Candidate-set BM25 uses different corpus statistics and is not guaranteed to match whole-corpus ranking. Correct question-bank workspace resolution with custom databases; derive subjects/skills from profiles or explicit fields and distinguish non-whitespace characters from words.
- Persist new trust grants as independent atomic workspace entries under `~/.dsh-tutorloop/trusted-workspaces.json.d/`, with read-only legacy JSON compatibility to avoid concurrent overwrites. To revoke all persisted grants, delete both stores, remove any explicit `workspacePath`, and restart every related host; apply the same rule to a custom `trustStore`. Revocation preserves learning data and is not multi-tenant authentication for shared remote hosts.
- Completed the bounded checks recorded in [Validation](https://github.com/Qinling-Melon-Farmers/dsh-tutorloop/blob/v0.4.1/docs/VALIDATION.md): automation, installed Windows desktop and real-model teaching, full host restart, and WSL Ubuntu 20.04 installation/backend checks. The record includes 112 Python tests, 17 Node tests with the real Python backend and zero skips, eight release/issue-automation tests, build and the 36-file package allowlist, plus later guidance/client regressions. Linux had no model or graphical-desktop test. Image success coverage includes a mocked branch and a separate real allowed-CDN load. These observations do not certify teaching quality.
- Correct historical boundaries: 219 papers and about 23,000 questions described one local index, not bundled data or universal playability. Earlier performance claims did not establish retrieval equivalence; deleting only the legacy trust file is insufficient for storage introduced in 0.4.0. Subjective feedback may still misjudge answers, disclose hints or add requirements. Not every write is idempotent; reread state before retrying after cancellation.

## 0.4.0（2026-10-26；未发布 npm / Not published to npm）

### 中文

- 保留原 tag。发布在 Windows CI 的工作区路径断言处停止：测试将已解析路径与未解析的 8.3 TEMP 别名比较；Linux 通过。npm registry 无 0.4.0，实际 npm 交付由 0.4.1 承接。
- README 改为通用学习定位，按档案科目筛选内置示例，StudyHub 默认课程去除国考假设；中英教学提示与批改请求依据真实模型样本细化，允许直接肯定正确答案并安排复述，不为找错增加标准。
- 补齐七个真题动作的 JS bridge 白名单，教师工具增至 18 个，新增作答前 `prepare_rubric`；全文 `find_materials` 与批改动作仅供教师调用。
- 通过 `student_material_ids` 区分学生材料与教师参考；隐藏无明确角色的旧来源，保留旧题干材料与历史成绩。未标定题只保存定性、空分数反馈，不推进掌握；数值量表须在任何作答前确认，新反馈引用材料和学生原句。
- 保留结构化图文题，仅支持两指定 CDN 的 HTTPS 图源，必要图像完整加载且经用户确认后才能正常交卷；StudyHub 文本转换拒绝图文题与未标定开放题。
- 整卷按轮绑定独立练习，重做不继承旧成绩；待批改/定性结果不计数值正确率。创建、绑定及推进使用事务，失败回滚；旧轮次无法可靠归属时需重开。
- 修复大库规范化、阈值切换、候选漏召回及旧硬上限问题，候选集 BM25 不保证全库排序等价；修复自定义 DB 的题库定位，区分字符/词计量与通用科目、技能。
- 新信任授权独立原子写入 `trusted-workspaces.json.d/`，只读兼容旧 JSON。全部撤销须处理旧文件和新目录、移除显式 `workspacePath`（如有），再重启所有相关宿主；自定义 `trustStore` 同理。
- 本地运行时验收已完成，0.4.1 沿用相同运行时代码并修正 CI 测试，详见 [验收记录](https://github.com/Qinling-Melon-Farmers/dsh-tutorloop/blob/v0.4.1/docs/VALIDATION.md)。模型反馈、图像、历史轮次与检索限制仍适用；本地验收不等于该 tag 已发布 npm。

### English

- Preserve the original tag. Publication stopped at a Windows CI workspace-path assertion comparing a resolved path with an unresolved 8.3 TEMP alias; Linux passed. Version 0.4.0 is absent from the npm registry; 0.4.1 delivers these changes on npm.
- Reposition the README around general-purpose learning, filter built-in examples by profile subjects, and remove the exam-specific StudyHub course default. Refine Chinese/English guidance and grading requests using real-model samples, allowing correct answers to be accepted and followed by recall without invented criteria.
- Connect all seven paper actions through the JS bridge; provide 18 teacher tools including before-answer `prepare_rubric`. Restrict full-text `find_materials` and grading actions to teachers.
- Separate student passages from teacher references through `student_material_ids`; hide legacy sources without explicit roles while preserving old passages and scores. Save qualitative null-score feedback without mastery progression for uncalibrated questions. Confirm numeric rubrics before any answer and require source citations and original answer spans in new feedback.
- Preserve structured visual questions, supporting HTTPS images from the two declared CDNs only; require complete loading and user confirmation before normal submission. Reject visual questions and uncalibrated open questions in StudyHub text exports.
- Bind each paper round to independent exercises without inheriting old scores; exclude pending/qualitative results from numeric accuracy. Create, bind and advance transactionally with rollback; restart legacy rounds whose ownership cannot be established.
- Fix large-library normalization, threshold transitions, missed lexical candidates and the old hard cap. Candidate-set BM25 is not guaranteed to match whole-corpus ranking. Correct custom-database question-bank location and distinguish character/word units and general subjects/skills.
- Store new trust grants as independent atomic entries in `trusted-workspaces.json.d/`, reading legacy JSON for compatibility. Full revocation requires removing both stores and any explicit `workspacePath`, then restarting every related host; apply the same rule to custom `trustStore` paths.
- Local runtime acceptance is complete; 0.4.1 uses the same runtime and fixes the CI test. See [Validation](https://github.com/Qinling-Melon-Farmers/dsh-tutorloop/blob/v0.4.1/docs/VALIDATION.md). Model-feedback, image, legacy-round and retrieval limitations remain; local acceptance does not mean this tag was published to npm.

## 0.3.3（2026-10-26）

### 中文

- 已发布 npm。为万级片段工作区加入候选预筛后 BM25 检索，改善大库响应时间；该版预筛仍有规范化、阈值切换及硬上限漏召回问题，后续在 0.4.0 修复并由 0.4.1 发布。性能优化不代表候选集排序与全库 BM25 等价，也不是经标注数据证明的相关性提升。
- 升级官方 GitHub Actions、开发依赖（React 19 / jsdom 30）和后端 Python 依赖。
- 按公开发布规范重写 README，新增 CHANGELOG，并修正 npm 包文件白名单以允许包含 CHANGELOG。

### English

- Published to npm. Add candidate prefiltering followed by BM25 for libraries with tens of thousands of chunks to improve response time. This version still has normalization, threshold-transition and hard-cap recall defects, corrected in 0.4.0 and shipped on npm in 0.4.1. Faster retrieval does not establish whole-corpus BM25 equivalence or relevance gains proven by labeled data.
- Update official GitHub Actions, development dependencies (React 19 / jsdom 30), and Python backend dependencies.
- Rewrite the README for public distribution, add CHANGELOG, and fix the npm package allowlist to include it.

## 0.3.2（2026-10-26）

### 中文

- 已发布 npm。持久保存经宿主确认的工作区信任，DSH 重启后不再要求这些工作区重新解锁。
- 0.3.2–0.3.3 使用 `~/.dsh-tutorloop/trusted-workspaces.json` 单文件。对这两版撤销全部持久授权时，删除该文件、移除显式 `workspacePath`（如有），再重启相关宿主；运行进程仍保留内存授权，自定义 `trustStore` 须处理其对应文件。
- 0.4.0 起新增独立 `.json.d/` 条目，0.4.1 已在 npm 交付；新版撤销须同时删除旧 JSON 与新目录，不能仅沿用删除单文件的方法。撤销不删除学习库。

### English

- Published to npm. Persist host-confirmed workspace trust so DSH restarts no longer relock previously confirmed workspaces.
- Versions 0.3.2–0.3.3 use the single file `~/.dsh-tutorloop/trusted-workspaces.json`. For these versions, revoke all persisted grants by deleting that file, removing any explicit `workspacePath`, and restarting related hosts. Running processes retain in-memory grants; handle the corresponding file when using a custom `trustStore`.
- Independent `.json.d/` entries were introduced in 0.4.0 and shipped on npm in 0.4.1. Newer versions require removal of both the legacy JSON and the new directory, not just the old file. Revocation preserves learning data.

## 0.3.1（2026-10-25）

### 中文

- 已发布 npm。练习下拉新增“本工作区（导师创建）”分组，便于复练导师已创建的题目。
- 方法卡增至 11 张，新增检索练习、自我解释与错因归类；面板文案去除国考默认假设，无本地真题库时显示相应空状态。

### English

- Published to npm. Add a workspace group for tutor-created exercises to the practice selector so learners can revisit them.
- Expand method cards to 11 with retrieval practice, self-explanation and error classification. Remove exam-specific assumptions from panel copy and show an appropriate empty state when no local paper bank is present.

## 0.3.0（2026-10-25）

### 中文

- 已发布 npm。加入工作区真题解析文件索引、逐题浏览、整卷练习、按科目/考点组卷与逐题报告；行测单选支持自动判分，申论参考答案用于教师上下文。
- 当时“219 卷、约 2.3 万题”仅表示一个本地工作区的索引规模，不能解释为全部题目已通过端到端可练性验收，也不是 npm 内置题库。可练性取决于原文、选项、参考与必要图像是否完整。
- 该版部分真题动作尚未接通 JS bridge，学生/教师来源边界、图像交卷校验与整卷轮次归属也在后续修复；相关修复由 0.4.1 在 npm 交付。

### English

- Published to npm. Index parsed paper files in the workspace and add question browsing, full-paper practice, subject/topic mixed sets and per-question reports. Support automatic marking for objective single-choice questions and teacher-context reference answers for subjective papers.
- The historical count of 219 papers and about 23,000 questions described one local workspace index. It was neither end-to-end acceptance of every question nor a question bank bundled with npm. Playability depends on complete passages, options, references and required images.
- Some paper actions were not yet connected through the JS bridge. Student/teacher source boundaries, image submission checks and round ownership also required later fixes, delivered on npm in 0.4.1.

## 0.2.0（2026-10-25）

### 中文

- 已发布 npm。题面直接展示材料原文与出处，长材料默认折叠。
- 主观题提交后可复制批改请求并切回聊天，待批改时面板轮询，反馈保存后自动更新。
- 新增维度、得分、反馈表格，以及遗漏要点和材料外推断提示区。

### English

- Published to npm. Show original passages and source references in the exercise view, collapsing long passages by default.
- After subjective submission, copy a grading request and return to chat; poll while grading is pending and refresh the panel when feedback is saved.
- Add criterion, score and feedback tables, plus areas for missing points and unsupported inferences.

## 0.1.2（2026-10-25）

### 中文

- 已发布 npm。将标签发布工作流中的 tarball 参数改为显式本地路径 `./release-artifact/dsh-tutorloop-$RELEASE_VERSION.tgz`，修正 0.1.1 的发布路径问题；保留原有 tag。
- 更新安装说明和发布验收记录，插件运行时功能与 0.1.1 相同。

### English

- Published to npm. Fix the tag-driven publish workflow by passing the tarball as an explicit local path, `./release-artifact/dsh-tutorloop-$RELEASE_VERSION.tgz`, resolving the 0.1.1 publication-path issue while preserving the existing tag.
- Update installation instructions and the release validation record; plugin runtime behavior is unchanged from 0.1.1.

## 0.1.1（2026-10-25；未发布 npm / Not published to npm）

### 中文

- 保留 git tag；当前 npm registry 无 0.1.1 版本，不能把 tag 存在视为发布成功。发布路径问题在 0.1.2 修正后交付。
- 更新版本元数据与安装文档以使用已引入的标签驱动发布流程；相对 0.1.0 未改变插件运行时代码。

### English

- Preserve the git tag. Version 0.1.1 is absent from the current npm registry; a tag alone does not establish successful publication. Version 0.1.2 fixes the publication path and delivers the release.
- Update version metadata and installation documentation for the tag-driven release workflow introduced previously; no plugin runtime code changes from 0.1.0.

## 0.1.0（2026-10-25）

### 中文

- 首个已发布 npm 的插件版本：17 个教师工具，以及练习、资料、方法与目标学生面板；材料导入、通用练习、冻结量表与证据反馈共用本地 Python 教学后端。
- 使用提交编号与版本校验保护答案提交流程，区分受助与独立作答，提供 Leitner 复习队列；Memoir 仅生成待审阅候选摘要，不自动写入记忆，也不代表所有操作均幂等。
- 提供 Windows 路径兼容处理、双系统 CI 和标签驱动发布流程；运行需要 DSH `>=0.2.1-rc.2 <0.3.0-0`、Node `^22.19.0 || >=24.0.0`、Python `3.11+` 及已声明的第三方 Python 运行时依赖。

### English

- First plugin version published to npm: 17 teacher tools and student panels for practice, materials, methods and goals, sharing a local Python teaching backend for material import, general exercises, frozen rubrics and evidence-based feedback.
- Use submission IDs and version checks to protect answer submission; distinguish assisted from independent work and provide a Leitner review queue. Memoir export produces a reviewable candidate only, without automatically writing memory or making every operation idempotent.
- Include Windows path compatibility, cross-platform CI and tag-driven publishing. Require DSH `>=0.2.1-rc.2 <0.3.0-0`, Node `^22.19.0 || >=24.0.0`, Python `3.11+` and the declared third-party Python runtime dependencies.
