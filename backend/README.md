# TutorLoop Python backend

Python 3.11+，依赖安装到独立虚拟环境。普通插件使用中由当前 DSH 会话模型讲解、出题与批改；面板不另开模型 API，也无需 Streamlit。`tutor.llm` 保留可选兼容 API/Ollama 客户端，只有明确调用时才请求模型。资料、作答与工具返回可能进入当前模型上下文，请按所用服务选择材料。

## 协议与工作区

执行 `python -X utf8 bridge.py`，stdin 输入单个 JSON，stdout 输出单个 JSON，最大请求 100 万字符。

```json
{"action":"overview","payload":{}}
```

成功为 `{"ok":true,"data":...}`，失败为 `{"ok":false,"error":"..."}`。可信宿主子进程不是独立 HTTP 鉴权服务，学生权限由 Node 路由限制。

- TUTOR_DB_PATH 指定 SQLite，宿主默认 `<workspace>/.dsh-tutorloop/tutor.sqlite3`。单独 Python 未设置时使用用户目录 `.dsh-tutorloop/data/tutor.sqlite3`，不写包目录。
- TUTOR_WORKSPACE_PATH 限定本地资料和真题根目录。普通文件导入要求配置，拒绝词法越界和真实路径逃逸。独立真题调用为兼容旧接口才回退库相邻目录；自定义 DB 不应替代显式工作区。
- 保留已有档案与题目快照，不复制私人资料成公共默认，不重写历史成绩。旧表缺失 profile 列时使用兼容迁移。

## 学生动作

| action | payload | 行为 |
| --- | --- | --- |
| overview | {} | 档案、来源/作答/pending计数、复习队列、公开当前题 |
| language_settings | {language?,resolved_language?} | zh/en/auto，默认中文；auto由界面解析为zh/en |
| set_profile | {name?,goal?,daily_minutes?,baseline?,subjects?,preset?} | 保存档案，可显式选guokao/gongkao |
| method_cards | {} | 通用方法与教学示例 |
| student_state / public_state | {exercise_id?} | 公开题面、真实作答与反馈，pending不是零分 |
| start_practice | {seed_id,mode?} | 创建coach/exam练习，返回公开题目及版本 |
| reveal | {exercise_id,kind?} | hint/answer辅助登记，考试模式先提交，版本递增 |
| submit_answer | {exercise_id,answer,submission_id,expected_version,visual_confirmed?} | 提交身份及版本校验；必要图像须用户确认；单选自动核对 |
| list_sources | {} | 最近200来源摘要，不返回教师全文 |
| search_materials / fetch_material | {query,limit?} / {url} | 显式搜索/读取公开网页并保存来源 |
| import_file / import_folder | {path} | 导入明确文件/目录，不自动生成可评分试卷 |
| export_memoir | {} | 待审阅候选，不自行写外部记忆 |
| zhenti_papers / zhenti_paper | {} / {paper_id} | 工作区卷表/题目可用信息 |
| zhenti_start_quiz | {paper_id?,subject?,skill?,count?,mode?} | 创建本轮整卷/组卷并绑定练习实例 |
| zhenti_quiz_state / zhenti_next | {} / {mode?} | 恢复/推进本轮，沿用本轮模式 |
| zhenti_report / zhenti_quit | {} | 本轮报告/退出 |

## 教师工具与冻结规则

DSH 注册 **18 个 tutor_* 教师工具**。以下五个动作禁止学生 HTTP 调用：

| action | Python payload | 规则 |
| --- | --- | --- |
| create_practice | {question,source_ids,mode?} | 基于1–8个已保存来源；工具question_json转换为对象 |
| get_context | {exercise_id?} | 教师题目、参考、量表、来源与该题作答 |
| prepare_rubric | {exercise_id,rubric,expected_version} | 无任何作答且未标定时确认题目特定分项；工具rubric_json转换为数组 |
| apply_feedback | {attempt_id,feedback} | 校验与持久化；工具feedback_json转换为对象 |
| find_materials | {query,limit?} | 教师全文检索，1–8条原始text；可能含教师参考，不允许学生API调用 |

新题 student_material_ids 明确列出公开来源。任何角色字段标为教师解析/参考/答案时不能公开。`public_exercise` 删除 reference_answer、reference_blocks、correct_option_id、explanation、rubric、hint。旧来源无公开声明时隐藏，但旧 question.material 保持可读；教师保留原始依据。用户本来拥有的导入原件仍能自行读取，本机制不是监考防作弊。

rubric_status=ready 按作答前冻结量表评分；uncalibrated 只定性反馈，criteria.awarded/max_points 与 score/max_score 为 null，不推进掌握，不计数值正确率。新反馈必须引用有效 evidence_ids 和答案中的非空 student_span。prepare_rubric 在已有作答后拒绝变更。历史反馈重读不等于满足新版校验，不能伪称历史已验证。

length_unit=characters 统计非空白字符（含标点）；words 按 Unicode 词项及连字符/撇号连接规则统计。均为教学口径，不是官方扣分标准。

## 图文、整卷与持久化

题干、材料与选项采用 text/image blocks，教师参考使用 reference_blocks。只认可 fb.fbstatic.cn、fb.fenbike.cn 的 HTTPS 图像，协议相对地址经验证转HTTPS；拒绝任意HTML、脚本或本地文件URL。必要图像缺失、不支持、截断或加载失败时不能正常交卷；用户确认后才传 visual_confirmed=true，模型不能代确认。

整卷 settings 绑定 quiz_id、seed 和本轮 exercise_ids；报告区分 pending、定性和数值成绩，仅看本轮实例。练习创建、current 与整卷激活/推进同事务，失败回滚；无可靠归属的旧settings需重开，不猜测成绩归属。

真题 JSON 由用户本地提供，不随npm分发，没有固定卷数或核验题量保证。题库文件限制工作区真实路径与JSON体积。普通导入保存hash、来源、页码和提取限制，机构解析不认证为官方答案。联网来源区分摘要与全文，不因此认证权威性。

大库词项候选召回已修复，引用保留原文；候选BM25排序不保证与全库等价。工作区信任在Node层只读兼容 trusted-workspaces.json，新确认独立写入 trusted-workspaces.json.d/。全部撤销须删两者、移除显式 workspacePath（如有），再重启宿主；自定义trustStore使用对应路径，不删除学习库。

## StudyHub与测试

内部 studyhub_export 保留原双参数调用，可选显式profile；课程/主题使用档案、科目或中性“学习练习”，分别导出字符/词数要求。当前格式不支持本插件图文，明确拒绝视觉题；未标定开放题不能导出有分项分值的标准题。输出是草稿和来源sidecar，不自动写外部题库。

在backend目录运行 `python -m unittest discover -s tests -v`。自动化测试采用临时库和受控资料/模型响应，不读取真实学习库。执行结果及本轮未完成的实际宿主验收见 [VALIDATION.md](../docs/VALIDATION.md)。
