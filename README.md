# TutorLoop · 学习陪练

[English](README.en.md) · [架构](docs/ARCHITECTURE.md) · [CI 与机器人](docs/AUTOMATION.md)

TutorLoop 是 DeepSeek Harness 的通用学习插件。复用当前 DSH 会话的模型，通过“了解目标 → 查材料 → 冻结题目和量表 → 独立作答 → 有依据的反馈 → 换题或延迟复习”引导学习。国考行测、申论是首个示例课程，核心流程也能用于其他学科。

GUI 与教学交互默认中文。语言设置提供 **中文 / English / 跟随 DSH** 三种模式；“跟随 DSH”响应宿主界面语言的变化，设置会随学习工作区保存。材料原文和你的答案保留原语言。

## 安装与开始

需要 DSH 0.2.1-rc.2、Node 22.19+ 或 24+、Python 3.11+。

从 npm 安装到 DSH 的 web profile，并初始化本地运行环境：

```powershell
dsh plugin --profile web add dsh-tutorloop@0.1.0
npx --yes --package=dsh-tutorloop@0.1.0 dsh-tutorloop setup
npx --yes --package=dsh-tutorloop@0.1.0 dsh-tutorloop doctor
```

也可以在 DSH 插件管理器中选择 `dsh-tutorloop`。按宿主要求重载后，打开学习工作区的会话，选择 **TutorLoop** 页面。若提示工作区尚未确认，在该会话中先发送一条消息再刷新。

<details>
<summary>从源码打包安装</summary>

```powershell
git clone https://github.com/Qinling-Melon-Farmers/dsh-tutorloop.git
cd dsh-tutorloop
npm ci
npm run build
node scripts/cli.mjs setup
node scripts/cli.mjs doctor
npm pack
```

在 DSH 插件管理器中安装生成的 `dsh-tutorloop-0.1.0.tgz`。

</details>

`setup` 仅在明确执行时创建独立 Python 环境并安装依赖，npm 安装不会自动运行 pip。Python 不在 PATH 时，使用 `setup --python 'Python可执行文件的绝对路径'`。已有环境可通过 `TUTORLOOP_PYTHON` 指定。Python 内核已经包含在 npm 包中，不需要另外启动 Streamlit，也不用填写独立模型密钥。

先设置学习目标和基础，再导入工作区里的 PDF/DOCX/TXT/MD/HTML，或者让导师搜索公开资料。可直接对 DSH 说：

> 我要备考国考副省级，每天5小时。先用一小题了解我的概括能力，一次只引导一步，等我作答后再批改。缺少材料时先搜索并保留来源，不要编造标准答案。

内置6道自编题、8张方法卡用于体验流程；它们不构成完整备考题库。通用档案默认“尚未诊断”，不会把开发者的个人备考信息当成所有人的默认情况。

## 已有能力

- DSH 原生学习面板和17个教学工具。
- 本地资料导入、网页搜索、全文检索、材料来源与PDF页码保留。
- 题目前冻结参考答案与10分量表；批改引用材料和学生作答。
- 选择题离线判分；主观题先保存，返回聊天由导师批改，待批改不等于0分。
- 提示、示范和修订单独记录，不把带提示做对当成独立掌握。
- 练习、答案、反馈与复习队列保存在工作区 `.dsh-tutorloop/tutor.sqlite3`。
- Memoir 只导出可审阅的学习习惯候选；不会自动写长期记忆。

旧 Local Tutor 可以保留。需要共享已有学习库时，在宿主配置中显式设置 `dbPath` 为旧 `data/tutor.sqlite3` 的绝对路径。默认不读取旧库，也不复制或覆盖它；配置项见[英文 README](README.en.md)。上传或提交源码时不要附带学习库和第三方试卷。

PDF 导入目前是资料入库，不是自动生成完整可判分试卷。图形、表格和扫描件需要检查或OCR。仅搜索摘要会明确标记；模型参考答案与机构解析不能自动称为官方答案。主观题评分是教学参考。

## 开发与发布

```powershell
npm run build
$env:TUTORLOOP_TEST_PYTHON = '已安装后端依赖的Python路径'
npm test
npm run test:python
npm run check:package
```

推送 `v*` 版本 tag 会触发 Windows/Linux 检查，通过后发布 npm 并创建 GitHub Release；首次使用自动发布需配置 npm Trusted Publisher。普通源码推送只触发 CI，详见[发布说明](docs/AUTOMATION.md)。真实模型的教学效果仍需使用你的服务商模型实际验收。

插件打包、原生页面与项目自动化参考 [dsh-memoir](https://github.com/Qinling-Melon-Farmers/dsh-memoir)。本项目采用 [Apache-2.0](LICENSE) 许可证。
