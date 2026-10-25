# dsh-tutorloop

[![npm version](https://img.shields.io/npm/v/dsh-tutorloop.svg)](https://www.npmjs.com/package/dsh-tutorloop)
[![npm downloads](https://img.shields.io/npm/dm/dsh-tutorloop.svg)](https://www.npmjs.com/package/dsh-tutorloop)
[![license](https://img.shields.io/npm/l/dsh-tutorloop.svg)](./LICENSE)

中文 · [English](./README.en.md) · [更新日志](./CHANGELOG.md) · [Releases](https://github.com/Qinling-Melon-Farmers/dsh-tutorloop/releases)

**DeepSeek Harness（DSH）的通用学习陪练插件。** 把你选择的资料变成小步练习，用原文和你的作答提供反馈，再安排后续复习。可用于英语阅读、编程基础、课程概念或其他自学主题，学习记录保存在当前工作区。

**资料导入 → 小步练习 → 证据反馈 → 复习。** 例如，读一篇英语短文后练习定位依据，或根据编程讲义解释一次循环的执行过程；一次聚焦一个问题，遇到困难逐步提示，再换一个例子检验理解。

当前 **DSH 会话模型**负责讲解、出题和主观反馈。面板不另开模型 API，也不要求额外密钥；Python 教学内核随 npm 分发，无需 Streamlit。记录保存在本机，但你选用的材料、答案与工具返回可以进入 DSH 模型上下文，请按宿主模型服务的隐私约定选择资料。

## 安装

要求 DSH `0.2.1-rc.2`、Node `22.19+ / 24+`、Python `3.11+`。通过正式 npm 包安装，当前版本见页首 npm 徽章。

```bash
dsh plugin --profile web add dsh-tutorloop
npx --yes --package=dsh-tutorloop dsh-tutorloop setup
npx --yes --package=dsh-tutorloop dsh-tutorloop doctor
```

以上第一条命令用于 web profile；使用 desktop 时，在该宿主的插件管理器安装同一个 npm 包 `dsh-tutorloop`。安装到你实际启动的 profile，按宿主要求重载，在带工作目录的会话中打开 **TutorLoop**。界面与教学默认中文，支持 English/跟随 DSH；材料原文保留原语言。

## 首次使用

1. 在会话中说明目标、基础和科目，保存学习档案。
2. 选择工作区资料，例如 `materials/lesson.pdf` 或 `materials/notes.md`，也可选择公开网页。导入保留原文用于检索和练习，不自动生成可判分试卷。
3. 确认哪些原文可以作为练习材料，哪些只是教师参考；答案与解析不混入学生题面。
4. 从一个小任务开始，先独立尝试，卡住后再逐步提示。需要分项评分时在作答前确认要求；未准备评分标准的题先给定性反馈，已有答案后不补改标准。
5. 独立作答。必要图像须全部成功加载并由你确认；缺图、不支持的图源或加载失败不能正常交卷。
6. 主观题提交后复制批改请求，回到同一 DSH 会话让模型反馈。请求绑定具体练习与作答，面板读取对应反馈；待批改不是零分。

可以直接在会话中说：“导入 `materials/lesson.pdf`，先了解我的基础，再用小问题带我练习；反馈请引用材料和我的原句，最后安排复习。”

## 能力与边界

| 能力 | 行为 |
| --- | --- |
| 证据反馈 | 校验材料编号与学生原句；模型对内容的理解和判断仍需核对 |
| 学生/教师分离 | 学生题面隐藏参考答案、参考图文、量表与教师来源；旧来源未显式公开时隐藏，保留旧题干材料 |
| 未标定题 | `uncalibrated` 只给定性反馈，分项分值、总分、满分为 null，不推进掌握或计算数值正确率 |
| 图文题 | 结构化文本/图像，不执行原始 HTML；图源仅限 `fb.fbstatic.cn`、`fb.fenbike.cn` 的 HTTPS 地址，仍需确认实际加载 |
| 可选题库适配 | 有兼容题库时支持选题、整卷与组卷；每轮绑定独立练习实例，不继承旧轮成绩 |
| 通用主题与长度 | 科目/技能来自题目或档案；`characters` 统计非空白字符（含标点），`words` 按词计数，均为教学口径 |
| 检索 | 保留引用原文，修复大型库候选召回；候选集 BM25 排序不承诺与全库完全等价 |
| 复习与记忆 | 区分辅助、重做与独立作答，安排后续复测；Memoir 只生成待审阅候选摘要 |
| StudyHub 导出 | 内部转换器生成草稿与来源说明；当前不支持图文而明确拒绝视觉题，未标定开放题不能导出评分量表 |

题库适配是可选能力，资料导入和通用练习无需现成题库。题库数据不随 npm 分发；使用适配器需要你有权使用且符合格式的材料。可练性取决于原文、选项和参考是否完整，来源声明不代表权威认证。适配格式见[后端说明](./backend/README.md)。

18 个 `tutor_*` 教师工具与学生面板共用后端。新题用 `student_material_ids` 明确公开来源；`tutor_prepare_rubric` 可在作答前确认题目特定量表。`get_context`、`create_practice`、`prepare_rubric`、`apply_feedback`、`find_materials` 仅供教师工具调用。用户仍可自行读取自己的原件；面板不是防作弊系统。提交编号和版本避免把重试变成另一份答案；不是所有写入都幂等，取消也可能晚于提交，应先重读状态。

TutorLoop 不是官方评分或监考平台，也不声称复现 ChatGPT 内部架构或达到同等教学质量。模型已收到的教师信息仍可能被其披露；主观反馈质量需要实际评估。

## 工作区与授权

| 配置 | 默认 | 说明 |
| --- | --- | --- |
| `dbPath` | `<workspace>/.dsh-tutorloop/tutor.sqlite3` | 显式指定同一库意味着主动共享记录 |
| `workspacePath` | 无 | 显式预信任工作区；日常使用会话 cwd |
| `trustStore` | `~/.dsh-tutorloop/trusted-workspaces.json` | 兼容旧 JSON，新确认写入对应 `.d` 目录 |

新授权位于 `~/.dsh-tutorloop/trusted-workspaces.json.d/`，按工作区独立原子写入，避免多实例覆盖；这不是共享远程宿主的多租户鉴权。

**撤销全部持久授权：同时删除旧 `trusted-workspaces.json` 和 `trusted-workspaces.json.d/`，再重启所有相关宿主。** 运行进程仍保留内存授权；若有显式 `workspacePath` 也须移除。自定义 `trustStore` 时处理对应文件与 `.d` 目录。撤销授权不删除学习库。

## 开发与发布

```bash
git clone https://github.com/Qinling-Melon-Farmers/dsh-tutorloop.git
cd dsh-tutorloop
npm ci
npm run build
node scripts/cli.mjs setup
npm test
npm run test:python
```

CI 在 Windows/Linux 上为 PR 与 main 运行检查；推送 `v*` 标签后，经验证与 GitHub 环境配置，以 OIDC 发布 npm 并创建 GitHub Release。附件取自 npm 实际 tarball 并验证完整性。详见 [CI 与机器人](./docs/AUTOMATION.md)、[架构](./docs/ARCHITECTURE.md)和[后端协议](./backend/README.md)；已执行检查与未完成验收以[验证记录](./docs/VALIDATION.md)为准。

Apache-2.0 License © 2026 Qinling-Melon-Farmers
