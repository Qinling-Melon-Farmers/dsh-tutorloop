# Validation record

Date: 2026-10-26. Candidate: 0.4.0. These are bounded observations, not a claim of model-independent teaching quality.

## Automated checks

- 112 Python tests passed: source roles, grading evidence and original-answer spans, calibrated versus qualitative feedback, atomic quiz creation/advancement, per-round reports, images, Unicode retrieval, workspace paths and StudyHub limits.
- 17 Node tests passed with the real bundled Python backend and zero skips: HTTP → Node → Python, teacher/student boundaries, origin checks, eight concurrent trust writers, UI interactions, language changes, bound grading requests, images and polling.
- 8 release/issue-automation tests passed. Build and the 36-file package allowlist passed. Papers, personal databases, credentials, environments and acceptance scripts are excluded.
- Subsequent guidance refinements passed the six plugin tests; client refinements passed the four client tests. Prompt assertions check that instructions exist, not that every model obeys them.

## Installed Windows desktop

DSH 0.2.1-rc.2 desktop, Node 24, Python 3.12.7. Installed the local tarball through the desktop host's public plugin manager after backing up the previous plugin and profile manifests. The CLI correctly refuses to manage the desktop-owned profile. The other eight direct dependency declarations were unchanged. Package doctor passed.

The package manager attempted to rebuild an existing optional cpu-features dependency and reported a native-build warning; its package command exited successfully and the TutorLoop installation applied. TutorLoop's runtime and teaching flows passed. This does not certify unrelated plugins or that optional dependency.

Actual Electron UI and host checks used isolated synthetic workspaces:

| Area | Observed result |
| --- | --- |
| Existing materials | Source count and question-bank listing remained accessible. No test answers were submitted to the existing study workspace. |
| Trust | A workspace confirmed by a real teaching message stayed accessible after complete host restart, before another message or tool touch. Legacy grants also loaded. |
| Teacher references | A synthetic answer PDF's sentinel remained available to teacher retrieval/context but absent from exam/student responses. Publishing teacher sources, including conflicting role fields, was rejected. |
| Public API | Teacher retrieval and grading actions were rejected through the student HTTP route. |
| Objective paper | Two synthetic questions submitted and graded. A second round had a new identity, zero answered/scored questions and null accuracy. |
| Images | An unavailable URL visibly failed and disabled submission. Intercepting only that synthetic URL with an original PNG tested successful loading and required confirmation; this success branch was mocked. Separately, an actual allowed CDN image loaded at 637×126 natural resolution. |
| Language/theme | Chinese, English and follow-host mode worked without translating source material. The dark-theme report was legible. No page errors were observed during the recorded window. |
| Grading request | Actual clipboard text identified the submitted exercise and attempt. |
| Rubric lifecycle | A real model prepared a question-specific rubric before answering; the version advanced and student responses still omitted criteria. An answered uncalibrated question saved qualitative feedback with null score/maximum. |

Synthetic logs and desktop artifacts remain outside the repository and package. Private workspace names, paths, papers and account data are not publication assets.

## Real-model teaching samples

Used the host's configured DeepSeek-V4.1-Flash / deepseek-flash model in synthetic sessions. No separate provider key was extracted or configured.

- Chinese passage extraction: imported/retrieved material, persisted a specific exercise, waited for an answer, reduced the task after confusion, then offered a fill-in scaffold. Two requested hints were recorded. A submitted unsupported inference was identified with actual source IDs and answer spans; feedback reached the panel.
- English/generalization: an English profile produced a subject-specific exercise with a 30-word limit and words counting. A 16-word answer received saved 10/10 feedback with valid citations and original-answer spans. The updated guidance's first English presentation contained the passage/task without an answer hint, and its initial feedback call passed schema validation.
- Qualitative mode and before-answer rubric preparation both completed through real host-model tools.

Observed weaknesses matter: the first Chinese presentation gave an unrecorded hint; an early feedback call used incorrect JSON field types and the model corrected it after rejection. Some responses exposed internal IDs, added requirements beyond the rubric, or invented criticism of a reasonable summary. Guidance and the copied review request were tightened, including explicit permission to find no error. These mitigations do not prove semantic grading errors or answer disclosures impossible. Source/span validation establishes provenance and exact quotation, not correct interpretation. A larger blind evaluation is necessary before claiming parity with a particular ChatGPT study conversation.

The final installed-client check showed no unrelated exam examples in the English profile. Two final model samples accepted correct answers without inventing a required correction and proposed a single recall task; the English reply stopped repeating exercise/attempt IDs. Some incidental wording still over-interpreted the answer, so the limitations above remain. These final samples are not a blind quality benchmark.

## Ubuntu 20.04 compatibility

WSL Ubuntu 20.04.3, Linux Node 22.23.2 and a new isolated Python 3.12.13 environment. Installed the candidate tarball into a new temporary directory; setup and doctor passed. Existing DSH/Memoir files, environments and system packages were unchanged.

The installed package's tool → Node → Python flow passed English profile/import/retrieval/exercise/submission/validated feedback, new-bridge persistence and workspace isolation. Seven paper actions passed through real HTTP → Node → Python with synthetic arithmetic questions, including exam mode, first-round accuracy, a zeroed second round and 403 for teacher actions/foreign origins. No model or graphical desktop was tested on Linux. Later prompt, client and documentation refinements are covered separately on Windows; Linux backend source was unchanged.

Hosted CI uses ubuntu-latest plus Windows. The explicit Ubuntu 20.04 claim refers to the local WSL check, not the hosted runner image.

## Retrieval measurements

Two read-only queries against 11,417 chunks, each in a fresh process: corrected retrieval took 3.397/1.687 seconds and peaked at 217.2/178.8 MB, versus 36.823/13.565 seconds and about 444 MB before optimization. The earlier hard-cap optimization was faster but failed deterministic recall cases; the corrected implementation removes that cap. Top-six overlap with baseline was 3/6 and 6/6. Candidate-set BM25 changes corpus statistics; these are performance observations, not relevance gains proven by labeled data.

## Remaining limits

- Subjective feedback and conversational hint/answer discipline depend on the host model. Tests do not certify pedagogical or factual accuracy.
- Only declared HTTPS image hosts are supported. PDF extraction does not reconstruct complex layouts, scanned diagrams or complete banks. Unsupported visual content and StudyHub visual exports fail explicitly.
- Importing a document does not establish its authority or redistribution rights. No personal question bank ships with this package.
- Old unknown-source exercises remain conservative; historical quizzes without reliable per-round ownership must be restarted. Historical scores are not rewritten.
- Cancellation may follow a committed write. Reread state before retrying; not every write is idempotent.
