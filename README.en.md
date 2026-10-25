# dsh-tutorloop

[![npm version](https://img.shields.io/npm/v/dsh-tutorloop.svg)](https://www.npmjs.com/package/dsh-tutorloop)
[![npm downloads](https://img.shields.io/npm/dm/dsh-tutorloop.svg)](https://www.npmjs.com/package/dsh-tutorloop)
[![license](https://img.shields.io/npm/l/dsh-tutorloop.svg)](./LICENSE)

English · [中文](./README.md) · [Changelog](./CHANGELOG.md) · [Releases](https://github.com/Qinling-Melon-Farmers/dsh-tutorloop/releases)

**A general-purpose study coach for DeepSeek Harness (DSH).** Turn selected materials into small practice tasks, receive feedback grounded in the source and your answer, and revisit what you learn. Use it for English reading, programming fundamentals, course concepts, or other self-study topics. Records stay in the current workspace.

**Import materials → practice in small steps → receive evidence-based feedback → review.** Locate evidence in a reading passage or explain a loop from a programming lesson. Focus on one question at a time, use gradual hints when stuck, then try another example to check understanding.

The **current DSH session model** teaches, writes questions, and reviews written answers. The panel does not open another model API or require another model key. The bundled Python core needs no Streamlit. Records stay local, but selected materials, answers, and tool results can enter the DSH model context. Choose materials according to that model service's privacy terms.

## Installation

Requires DSH `0.2.1-rc.2`, Node `22.19+ / 24+`, and Python `3.11+`. Install the official npm package; the npm badge above shows the available version.

```bash
dsh plugin --profile web add dsh-tutorloop
npx --yes --package=dsh-tutorloop dsh-tutorloop setup
npx --yes --package=dsh-tutorloop dsh-tutorloop doctor
```

The first command targets the web profile. For desktop, install the same npm package `dsh-tutorloop` through that host's plugin manager. Use the profile you actually launch, reload as required, and open **TutorLoop** in a conversation with a working directory. Chinese is the default; English and follow-DSH modes are available. Materials retain their original language.

## First session

1. Describe your goal, prior knowledge, and subjects; save the learning profile.
2. Select workspace materials such as `materials/lesson.pdf` or `materials/notes.md`, or choose a public webpage. Import preserves originals for retrieval and practice; it does not automatically create gradable papers.
3. Confirm which passages belong in the student task and which are teacher references. Answers and explanations stay out of the student question.
4. Begin with a small task: try independently, then use gradual hints if needed. Agree on scoring criteria before answering; questions without prepared criteria receive qualitative feedback. Criteria cannot be amended after answering.
5. Answer independently. Required images must load successfully and be confirmed by you. Missing, unsupported, or failed images block normal submission.
6. After submitting a written answer, copy its review request and return to the same DSH conversation. The request identifies the exercise and attempt; the panel reads that attempt's feedback. Pending review is not a zero score.

For example: “Import `materials/lesson.pdf`, check my prior knowledge, and guide me with small questions. Ground feedback in the passage and my wording, then plan a review.”

## Capabilities and limits

| Capability | Behavior |
| --- | --- |
| Evidence-based feedback | Validates material IDs and original-answer spans; the model's interpretation still needs review |
| Student/teacher separation | Student views hide reference answers, reference blocks, rubrics, and teacher sources; unknown legacy sources stay hidden while old question material remains readable |
| Uncalibrated rubrics | `uncalibrated` feedback has null criterion points, total score, and maximum score; it does not advance mastery or count toward numerical accuracy |
| Rich questions | Structured text/images without raw HTML execution; images require HTTPS on `fb.fbstatic.cn` or `fb.fenbike.cn` plus actual load confirmation |
| Optional question-bank adapter | Compatible banks support item selection, papers, and mixed sets; each round binds its own exercise instances without inheriting earlier scores |
| General topics and length | Subject/skill follow the question or profile; `characters` counts non-whitespace characters including punctuation, while `words` counts words; both are teaching conventions |
| Retrieval | Lexical retrieval preserves originals and fixes large-library candidate recall; candidate BM25 ranking is not promised to equal whole-corpus BM25 |
| Review and memory | Assisted, revised, and independent attempts are distinguished; later checks are scheduled; Memoir receives reviewable candidates, not automatic writes |
| StudyHub export | The internal converter produces drafts and provenance; image questions are explicitly rejected, and uncalibrated open questions cannot export a scored rubric |

Question-bank adaptation is optional: importing materials and creating general practice require no existing bank. Bank data does not ship in npm. Adapters need compatible materials you have permission to use; availability depends on complete passages, options, and references. Provenance is not authority certification. See the [backend documentation](./backend/README.md) for adapter formats.

The 18 `tutor_*` teacher tools and student panel share a backend. New questions identify public sources with `student_material_ids`; `tutor_prepare_rubric` prepares question-specific criteria before answering. `get_context`, `create_practice`, `prepare_rubric`, `apply_feedback`, and `find_materials` are teacher-only. Users can still read their original files; the panel is not an anti-cheating system. Submission IDs and versions prevent retries becoming different answers; not every write is idempotent, and cancellation may follow a commit. Reread state before retrying.

TutorLoop is not an official scoring or proctoring platform. It does not claim to reproduce ChatGPT's internal architecture or equivalent teaching quality. A model may disclose teacher references it has received; subjective feedback requires evaluation.

## Workspaces and access

| Option | Default | Meaning |
| --- | --- | --- |
| `dbPath` | `<workspace>/.dsh-tutorloop/tutor.sqlite3` | Explicitly using one database opts into shared records |
| `workspacePath` | none | Explicit pre-trusted workspace; normal use follows session cwd |
| `trustStore` | `~/.dsh-tutorloop/trusted-workspaces.json` | Reads legacy JSON; new grants use its adjacent `.d` directory |

Independent atomic entries in `~/.dsh-tutorloop/trusted-workspaces.json.d/` prevent concurrent hosts overwriting grants. This is not tenant authentication for a shared remote host.

**To revoke all persistent grants, delete both the legacy JSON and the `trusted-workspaces.json.d/` directory, then restart every relevant host.** Running hosts retain memory grants. Remove explicit `workspacePath` configuration too, if present. A custom `trustStore` uses the corresponding file and `.d` directory. Revocation does not delete learning databases.

## Development and release

```bash
git clone https://github.com/Qinling-Melon-Farmers/dsh-tutorloop.git
cd dsh-tutorloop
npm ci
npm run build
node scripts/cli.mjs setup
npm test
npm run test:python
```

CI checks PRs and main on Windows/Linux. A `v*` tag validates the release, uses OIDC npm publishing with the configured GitHub environment, and creates a GitHub Release. Its asset comes from the actual npm tarball with integrity verification. See [Automation](./docs/AUTOMATION.md), [Architecture](./docs/ARCHITECTURE.md), and the [backend protocol](./backend/README.md). Executed checks and outstanding acceptance steps are recorded separately in [Validation](./docs/VALIDATION.md).

Apache-2.0 License © 2026 Qinling-Melon-Farmers
