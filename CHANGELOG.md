# 更新日志 / Changelog

本文件记录面向用户的显著变化;完整提交历史见 [Releases](https://github.com/Qinling-Melon-Farmers/dsh-tutorloop/releases)。

## 0.4.0

- README采用通用学习定位，内置示例按档案科目筛选；依据真实中英文教学实测细化提示与批改请求，正确答案可直接肯定并安排复述，不为找错而增加标准。模型的语义判断仍需核对。

- 修复七个真题动作缺失 JS bridge 白名单；教师工具增至18个，新增作答前 prepare_rubric。find_materials 全文检索改为教师专用，学生不能借此读出教师参考。
- 新题 student_material_ids 指定学生材料，教师参考和答案不公开；隐藏无明确角色的旧sources，保留旧题干材料，不改写历史成绩。
- 未标定主观题仅给定性反馈，分项、总分、满分为null，不推进掌握；需要数值量表时必须在任何作答前标定。新反馈引用材料与学生原句。
- 保留结构化题干/材料/选项图像，仅认可两指定CDN的HTTPS图源；必要图像缺失、加载失败或不支持时不能正常交卷，须由用户确认完整加载。StudyHub文本转换器明确拒绝图文题和未标定开放题，不静默丢图或输出伪评分标准。
- 整卷每轮绑定独立练习实例，重做不继承旧成绩；pending/定性结果不计数值正确率。创建练习与绑定/推进同事务，失败回滚；无可靠归属的旧整卷状态需重开。
- 修复大库规范化与词项候选召回，候选BM25不承诺全库排序等价；自定义DB不再误导题库工作区根目录。
- 科目/技能使用档案或显式字段，计量区分非空白字符与词；StudyHub课程默认不再固定国考。
- 新授权独立写入 trusted-workspaces.json.d/，只读兼容旧JSON，修复多实例覆盖。全部撤销须删旧文件与目录、移除显式workspacePath（如有），再重启相关宿主。
- 更正历史描述边界：0.3.0的“219卷、约2.3万题全部可练”是当时本地数据描述，不是npm内置或端到端保证；0.3.3的性能说明不是全库BM25等价承诺；0.3.2的单文件撤销方式不适用新版独立条目。
- 本地安装与实际宿主、模型、重启验收进行中。执行结果和未完成事项以 docs/VALIDATION.md 为准，不提前宣称全部完成。

### English notes

- Connect all seven exam actions; add teacher-only pre-answer rubric preparation (18 tools), and restrict full-text material retrieval to teacher tools.
- Separate student passages from references; uncalibrated questions receive qualitative null-score feedback without mastery progression.
- Preserve approved HTTPS images and require load confirmation; reject unsupported rich StudyHub exports and scored exports of uncalibrated open questions.
- Bind quiz results to each round's exercise instances, transact creation with activation/advancement, and invalidate unreliable legacy rounds.
- Fix normalized candidate recall without promising whole-corpus BM25 ranking equivalence; preserve character/word units and general-topic defaults.
- Use independent trust entries with legacy JSON compatibility. Revoke both stores, remove explicit workspace configuration, and restart hosts.
- Historical local paper counts were not bundled data or end-to-end guarantees. Live acceptance remains in progress; see Validation.

## 0.3.3（2026-10-26）

- **大库检索性能**:BM25 检索在万级片段的工作区上保持响应速度(预过滤 + 精确投影保持权威)。
- 依赖升级:官方 GitHub Actions、开发依赖(React 19 / jsdom 30)、后端 Python 依赖(dependabot 三个分组)。
- README 按公开发布规范重写,新增本更新日志。

## 0.3.2（2026-10-26）

- **工作区信任持久化**:DSH 重启后面板不再对已确认过的工作区重新上锁;信任列表保存在 `~/.dsh-tutorloop/trusted-workspaces.json`,可随时删除以撤销授权。

## 0.3.1（2026-10-25）

- **面板泛化**:练习下拉新增“本工作区(导师创建)”分组,导师出过的题沉淀复练;方法卡增至 11 张(新增检索练习、自我解释、错因归类三张通用卡);无本地真题库的工作区真题区优雅降级;文案去除国考默认假设。

## 0.3.0（2026-10-25）

- **真题库与整卷/组卷**:扫描工作区解析文件建立轻量索引(219 卷、约 2.3 万题全部可练);面板新增“真题与整卷”区——整卷逐题作答(行测单选自动判分)、逐题浏览、按科目/考点随机组卷、正确率逐题报告。行测选项与每题材料经本地核验对齐;申论给定资料与参考答案只进教师上下文。

## 0.2.0（2026-10-25）

- **卷面视图**:材料原文与出处直接展示在题面,长材料默认折叠。
- **交卷即批改**:主观题提交后一键复制批改请求并切回聊天;待批改期间面板轮询,批改完成自动更新。
- **分项表格反馈**:维度/得分/反馈表格,新增遗漏要点与材料外推断警示区。

## 0.1.x（2026-10-24 ~ 25）

- 0.1.0~0.1.2:首个发布线——17 个教师工具、学生面板(练习/资料/方法/目标)、冻结量表与证据批改、幂等提交与版本校验、Leitner 复习队列、Memoir 候选导出、双系统 CI 与标签驱动发布。
