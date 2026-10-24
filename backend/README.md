# TutorLoop Python backend

Python 3.11+。在独立虚拟环境中安装 `requirements.txt`。后端不依赖Streamlit，也不启动或要求本地模型服务；DSH主会话可以使用宿主模型讲解、生成练习并回填评分。`tutor.llm`保留可选的兼容API/Ollama客户端，不会在普通bridge动作中自动调用。

每次执行 `python -X utf8 bridge.py`，stdin接收一个JSON对象，stdout只输出一个JSON对象：

```json
{"action":"overview","payload":{}}
```

成功返回 `{"ok":true,"data":...}`；失败返回 `{"ok":false,"error":"..."}`。单次请求最大100万字符。

## 运行时隔离

- `TUTOR_DB_PATH`：当前学习库SQLite文件。由宿主按工作区指定；未设置时使用用户目录的 `.dsh-tutorloop/data/tutor.sqlite3`，不写入包目录。
- `TUTOR_WORKSPACE_PATH`：明确允许读取资料的工作区。导入的相对路径基于这里；绝对路径也必须在该目录内。未配置时拒绝导入；先拒绝词法越界，再校验真实路径，禁止符号链接逃出工作区。
- 不迁移或读取旧工具数据库，不把用户个人档案复制成公共默认。首次启动为通用、未诊断档案；显式国考预设也不假定私人基础和可用时间。已有数据库中保存的档案与练习快照保持原值。

## 学生动作

| action | payload | data |
|---|---|---|
| `overview` | `{}` | 学习档案、sources数量、attempts/pending、reviews/due、公开current_exercise、seed_choices |
| `language_settings` | `{language?,resolved_language?}` | `{language,resolved_language}`。默认zh；language可为zh/en/auto，auto由界面根据DSH语言提供resolved_language。无参数读取，有参数保存当前工作区设置；不改学习目标 |
| `set_profile` | `{name,goal,daily_minutes,baseline?,subjects?,preset?}` | `{learning_profile}`。preset可为`gongkao`或`guokao`；使用preset时前三项可省略，否则必须给出 |
| `method_cards` | `{}` | `{cards:[8张卡],note}`，内置卡为国考教学示例 |
| `student_state` | `{exercise_id?}` | `{exercise,attempts,learning_profile,note?}`；无当前题时exercise为null。`public_state`是别名 |
| `start_practice` | `{seed_id,mode?}` | 公开题目对象，含id/version。mode为coach或exam |
| `reveal` | `{exercise_id,kind?}` | hint或answer文本；考试模式须先提交。写入辅助记录，版本递增 |
| `submit_answer` | `{exercise_id,answer,submission_id,expected_version}` | `{attempt_id,status,feedback,exercise_version}`；选择题自动核对，主观题等待教师回填 |
| `list_sources` | `{}` | 最近200个来源的元数据数组，不是全库索引 |
| `find_materials` | `{query,limit?}` | `{sources,learning_profile,note}`，本地全库BM25，limit为1–8，来源含原始text |
| `search_materials` | `{query,limit?}` | 联网搜索并保存；limit为1–3，默认3 |
| `fetch_material` | `{url}` | 抓取公开网页并保存 |
| `import_file` | `{path}` | 只导入指定文件，不扫描兄弟文件 |
| `import_folder` | `{path}` | 递归导入明确指定目录的完成文件，不跟随目录外文件链接 |
| `export_memoir` | `{}` | 仅摘要候选，requires_confirmation=true，不自行写入外部记忆 |

学生题面不含reference_answer、correct_option_id、explanation、rubric、hint及教师sources。真实历史作答、已产生的反馈可以返回；不能由教师题库对象拼装学生状态。主观题pending不是0分。

## 教师工具专用

`create_practice {question,source_ids,mode?}` 基于1–8个已保存来源生成冻结练习；`get_context {exercise_id?}` 返回教师题目、量表与来源；`apply_feedback {attempt_id,feedback}` 校验并保存模型评分。它们必须只由DSH教师工具调用，不能加入面向浏览器的学生HTTP白名单。bridge是可信宿主的本地子进程，不是独立HTTP鉴权服务。

## 来源与导入结果

联网动作返回 `{added_chunks,sources,statuses,note}`。sources是元数据，无完整text；需全文时用find_materials。`kind=web_snippet_only`与`content_scope=search_snippet`明确表示仅搜索摘要；`kind=web_fulltext`表示已取得网页可见文本。`is_fulltext`区分实际提取文本与搜索摘要，不认证网页权威性、图像完整性或整本文档覆盖。来源保留获取时间、URL及未核验状态。DDGS失败不生成替代结果；目标域名受Fake-IP影响时保留搜索提供方返回的摘要，正文连接仍执行公网地址检查。

导入动作返回 `{added_chunks,documents,skipped,errors,statuses}`。PDF按原页保存file_sha256、pdf_page、content_role、needs_visual_review；跳过答题纸，不自动拆题、编造正确选项或认定机构解析为官方答案。普通TXT/MD/DOCX/HTML也保存SHA256与来源路径，重复内容跳过。每文件20MB、PDF500页、提取文字200万字符、DOCX解压80MB，每批最多300个支持文件；`.pdf.part`不处理。保存原始text，NFKC search_text只用于检索。manifest存当前数据库settings，不修改原文件。

## 测试

在backend目录执行 `python -m unittest discover -s tests -v`。测试使用临时数据库与模拟联网/模型返回，不依赖旧项目绝对路径、不调用真实模型或搜索服务，也不读取现有个人学习库。
