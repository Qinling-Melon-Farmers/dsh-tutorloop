# dsh-tutorloop

> **0.3.2**: workspace trust now persists across DSH restarts — panels no longer relock on workspaces you already confirmed — and BM25 retrieval stays fast on 10k+ chunk libraries.

[![npm version](https://img.shields.io/npm/v/dsh-tutorloop.svg)](https://www.npmjs.com/package/dsh-tutorloop)
[![npm downloads](https://img.shields.io/npm/dm/dsh-tutorloop.svg)](https://www.npmjs.com/package/dsh-tutorloop)
[![license](https://img.shields.io/npm/l/dsh-tutorloop.svg)](./LICENSE)

English · [中文](./README.md) · [Changelog](./CHANGELOG.md) · [Releases](https://github.com/Qinling-Melon-Farmers/dsh-tutorloop/releases)

**A local-first study-coach plugin for DeepSeek Harness (DSH).** It turns "know the goal → gather materials → freeze the question and rubric → answer independently → evidence-based feedback → retest with spacing" into an auditable loop: questions and grading criteria are frozen before you answer, feedback must cite material evidence and your own words, and every practice, answer, review, and review-queue entry is persisted as this workspace's learning archive.

The current DSH session model does the teaching and grading; the panel itself never calls a model. The Python teaching kernel ships inside the npm package — no Streamlit, no separate model keys.

> [!IMPORTANT]
> **Requires DSH `0.2.1-rc.2`, Node `22.19+ / 24+`, Python `3.11+`.** Learning archives are isolated per workspace. The list of host-confirmed workspaces lives at `~/.dsh-tutorloop/trusted-workspaces.json`; delete it to revoke all panel access.

```bash
dsh plugin --profile web add dsh-tutorloop@0.3.2
npx --yes --package=dsh-tutorloop@0.3.2 dsh-tutorloop setup
npx --yes --package=dsh-tutorloop@0.3.2 dsh-tutorloop doctor
```

Reload as the host requires, then open the **TutorLoop** view in any conversation with a working directory. For source installs see [Development](#development).

## Why TutorLoop

| Capability | What you get |
| --- | --- |
| Frozen rubrics | Questions, reference answers, and grading criteria freeze before you answer; grading never bends to fit an answer |
| Evidence-based grading | Per-criterion scores cite material evidence and your original wording; missed points, unsupported claims, and structure issues are separated |
| Paper view | Material passages with provenance render on the question card; long passages collapse; reference answers stay hidden until submission |
| One-click review loop | Submitting a written answer copies the review request and jumps to chat; the panel refreshes itself when grading lands |
| Local exam bank | After importing solution files: 219 vice-provincial papers, ~23k verified items |
| Full papers & mixed sets | Item-by-item full-paper runs with auto-graded choice questions; topic-based random sets; accuracy reports |
| Workspace isolation | Archives, tutor-created items, and the exam bank all travel with the workspace; the panel adapts to any subject |
| Governed memory | Hints and examples are recorded separately; assisted success never counts as mastery; Leitner-spaced review |
| Local first | Everything lives in the workspace's SQLite; no model keys inside, no cloud memory service |

Built for personal exam prep and self-study workflows that need "every attempt on record, every error traceable". It is not an official scoring system, a proctoring tool, or a vector-semantic knowledge base.

## How it works

```text
Set goal (tutor_set_profile) ──► Search / import materials
        │                               │
        ▼                               ▼
Create frozen practice ◄── Exam bank (zhenti:* / built-in examples)
        │
        ▼
Independent answer (submit_answer; choice items auto-grade)
        │
        ▼
One-click review request → DSH model ──► Structured feedback (table)
        │
        ▼
Review queue (Leitner 1/1/3/7 days)
```

Teacher tools (17 `tutor_*` actions) and the student panel share one frozen dataset: `public_exercise` sanitizes the student view, and reference answers live only in the teacher context. All writes are idempotent with version checks; failed submissions never score zero. The GUI defaults to Chinese with Chinese / English / follow-DSH modes; material originals are never translated.

## Configuration

| Option | Default | Notes |
| --- | --- | --- |
| `dbPath` | `<workspace>/.dsh-tutorloop/tutor.sqlite3` | Archive location; point it at an existing library explicitly if needed |
| `workspacePath` | none | Pre-trusted panel workspace (optional; everyday use does not need it) |
| Language | Chinese | Chinese / English / follow DSH; saved per learning workspace |

Exam-bank data does not ship with the package: place solution files under `粉笔试卷/答案解析/` and xingce options under `粉笔试卷/题目选项/` inside a workspace; the first "load exam list" builds the index (`粉笔试卷/真题索引.json`).

## Boundaries

- Grading is instructional: exam answers and explanations come from locally verified publisher files, not official rubrics.
- Reference answers are disclosed only after submission via the teacher context; the panel is not an anti-cheating proctor.
- PDF import is material ingestion (retrieval and question fodder), not automatic gradable papers.
- Memoir export produces reviewable habit-summary candidates only; nothing is auto-written to long-term memory.

## Development

```bash
git clone https://github.com/Qinling-Melon-Farmers/dsh-tutorloop.git
cd dsh-tutorloop && npm ci
npm run build && node scripts/cli.mjs setup
npm test && npm run test:python
```

CI (Windows/Linux) runs the full dual-stack suite on PRs and main; pushing a `v*` tag publishes to npm via OIDC after environment checks and attaches the tested tarball to a GitHub Release. See [Automation](./docs/AUTOMATION.md), [Architecture](./docs/ARCHITECTURE.md), and [Validation](./docs/VALIDATION.md).

Apache-2.0 License © 2026 Qinling-Melon-Farmers
