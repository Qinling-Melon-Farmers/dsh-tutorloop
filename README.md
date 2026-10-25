# dsh-tutorloop

> **0.3.2**:工作区信任持久化——DSH 重启后面板不再重新上锁,曾确认过的工作区自动恢复;BM25 检索在万级片段库上保持响应速度。

[![npm version](https://img.shields.io/npm/v/dsh-tutorloop.svg)](https://www.npmjs.com/package/dsh-tutorloop)
[![npm downloads](https://img.shields.io/npm/dm/dsh-tutorloop.svg)](https://www.npmjs.com/package/dsh-tutorloop)
[![license](https://img.shields.io/npm/l/dsh-tutorloop.svg)](./LICENSE)

中文 · [English](./README.en.md) · [更新日志](./CHANGELOG.md) · [Releases](https://github.com/Qinling-Melon-Farmers/dsh-tutorloop/releases)

**DeepSeek Harness（DSH）的本地优先学习陪练插件。** 它把“了解目标 → 查材料 → 冻结题目与量表 → 独立作答 → 有依据的反馈 → 换题或延迟复习”做成可审计的闭环：题目与评分标准在作答前冻结，批改必须引用材料证据与学生原句，练习、答案、反馈与复习队列全部落盘为本工作区的学习档案。

复用当前 DSH 会话的模型做讲解与批改，面板本身不发起模型调用;Python 教学内核随 npm 包分发,无需另装 Streamlit 或配置模型密钥。

> [!IMPORTANT]
> **要求 DSH `0.2.1-rc.2`、Node `22.19+ / 24+`、Python `3.11+`。** 面板访问的学习档案按工作区隔离;曾确认过的工作区列表保存在 `~/.dsh-tutorloop/trusted-workspaces.json`,删除该文件可撤销全部面板授权。

```bash
dsh plugin --profile web add dsh-tutorloop@0.3.2
npx --yes --package=dsh-tutorloop@0.3.2 dsh-tutorloop setup
npx --yes --package=dsh-tutorloop@0.3.2 dsh-tutorloop doctor
```

安装后按宿主要求重载,在带工作目录的会话中打开 **TutorLoop** 页面即可。源码安装与本地打包见[开发与发布](#开发与发布)。

## 为什么选择 TutorLoop

| 能力 | 用户得到什么 |
| --- | --- |
| 冻结量表 | 题目、参考答案与评分标准在作答前冻结;批改不得为迎合答案修改标准 |
| 证据批改 | 分项得分引用材料证据与学生原句,区分漏点、材料外推断与组织问题 |
| 卷面呈现 | 材料原文与出处直接展示在题面,长材料默认折叠;参考答案不提前公开 |
| 一键批改闭环 | 主观题提交后一键复制批改请求并切回聊天,批改完成面板自动更新 |
| 本地真题库 | 导入解析文件后可选 219 套副省级真题与模考、约 2.3 万道已核验题目 |
| 整卷与组卷 | 整卷逐题作答、行测单选自动判分;按科目与考点随机组卷;正确率报告 |
| 工作区隔离 | 学习档案、导师出的题与真题库都随工作区走;面板适配任意学科,不默认国考 |
| 可治理的记忆 | 提示与示范单独登记,带提示做对不计独立掌握;Leitner 间隔复习 |
| 本地优先 | 全部数据在本工作区 SQLite;不内置模型密钥,不依赖云端记忆服务 |

适合需要“练过即留痕、错因可回查”的个人备考与自学工作流。它不是官方考试评分系统、监考工具,也不是向量语义知识库。

## 工作原理

```text
了解目标(tutor_set_profile) ──► 检索/导入材料(import/find/fetch)
        │                              │
        ▼                              ▼
出题并冻结量表(create_practice) ◄── 真题库(zhenti:*/内置示例)
        │
        ▼
独立作答(submit_answer, 单选自动判分) ──► 一键批改请求 → DSH 模型
        │                                      │
        ▼                                      ▼
 复习队列(1/1/3/7天) ◄── 结构化反馈(apply_feedback, 表格呈现)
```

教师工具(17 个 `tutor_*` 动作)与学生面板共用同一套冻结数据:面板经 `public_exercise` 脱敏,参考答案与量表只在教师上下文出现。所有写入幂等且带版本校验,异常作答不计零分。GUI 与教学交互默认中文,语言支持中文 / English / 跟随 DSH,材料原文永不翻译。

## 配置

| 项 | 默认 | 说明 |
| --- | --- | --- |
| `dbPath` | `<工作区>/.dsh-tutorloop/tutor.sqlite3` | 学习档案位置;可在宿主配置显式指向既有库 |
| `workspacePath` | 无 | 预信任的面板工作区(可选;日常无需配置) |
| 语言 | 中文 | 中文 / English / 跟随 DSH,设置随学习工作区保存 |

真题库数据不随包分发:把解析文件放入工作区 `粉笔试卷/答案解析/`、行测选项放入 `粉笔试卷/题目选项/`,面板首次“载入真题列表”时自动建立索引(`粉笔试卷/真题索引.json`)。

## 边界

- 评分是教学诊断:真题答案与解析来自本地核验的机构文件,不代表官方评分标准。
- 参考答案只在交卷后经教师上下文披露;面板不是防作弊监考系统。
- PDF 导入是资料入库(检索与出题素材),不自动生成可判分试卷。
- Memoir 只导出可审阅的学习习惯候选摘要,不自动写长期记忆。

## 开发与发布

```bash
git clone https://github.com/Qinling-Melon-Farmers/dsh-tutorloop.git
cd dsh-tutorloop && npm ci
npm run build && node scripts/cli.mjs setup
npm test && npm run test:python
```

CI(Windows/Linux 双系统)在 PR 与 main 上运行全部双栈测试;推送 `v*` 标签经 GitHub 环境校验后以 OIDC 发布 npm 并附 GitHub Release。详见 [CI 与机器人](./docs/AUTOMATION.md)、[架构说明](./docs/ARCHITECTURE.md) 与 [验证记录](./docs/VALIDATION.md)。

Apache-2.0 License © 2026 Qinling-Melon-Farmers
