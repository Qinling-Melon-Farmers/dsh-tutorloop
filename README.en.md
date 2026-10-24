# TutorLoop

**Guided practice, grounded feedback, and review — inside DeepSeek Harness.**

[中文说明](README.md) · [Architecture](docs/ARCHITECTURE.md) · [Automation](docs/AUTOMATION.md)

TutorLoop is a DSH plugin for learning from your own documents and public web sources. It uses the model already configured in your DSH session and stores learning records locally. Chinese civil-service exam preparation is the first example curriculum; the teaching workflow also supports other subjects.

The GUI and teaching interaction default to Chinese. Choose **中文**, **English**, or **Follow DSH** in the panel. Follow DSH tracks the host interface language; the preference is saved per learning workspace. Source materials and submitted answers retain their original language.

The learning loop is: establish a goal → inspect source material → freeze a task and rubric → let the learner answer → give evidence-based feedback → check transfer with another task or a later review. Hints and demonstrations are recorded as assistance, rather than counted as independent mastery.

## What works

- Native DSH learning panel with goals, sources, practice, feedback history and review.
- 17 tools for the DSH teacher, including web search, local document import, task creation and grading persistence.
- PDF, DOCX, TXT, Markdown and HTML imports; provenance and page references; local BM25 retrieval.
- Public web search and URL import, with extracted text distinguished from search snippets.
- Objective grading and validated rubric-based feedback; unanswered or pending subjective work is not scored as zero.
- SQLite records separated by session workspace; frozen rubrics, idempotent submissions and optimistic version checks.
- Optional Memoir summary candidates; no automatic writes to long-term memory.

The package includes its Python backend. Streamlit and a separately checked-out backend project are **not required**.

## Install from this repository

Requires **DSH 0.2.1-rc.2**, Node **22.19+ or 24+**, and Python **3.11+**. The declared DSH compatibility range is `>=0.2.1-rc.2 <0.3.0-0`; the baseline tested locally is 0.2.1-rc.2. Version 0.1.0 is source-ready; availability on npm is not implied by this README.

```sh
git clone https://github.com/Qinling-Melon-Farmers/dsh-tutorloop.git
cd dsh-tutorloop
npm ci
npm run build
node scripts/cli.mjs setup
node scripts/cli.mjs doctor
npm pack
```

`setup` creates an isolated Python environment in `~/.cache/dsh-tutorloop/venv` and installs the backend requirements. It is an explicit step: npm installation does not run pip. If Python is not on PATH, use `setup --python /absolute/path/to/python`. To use an existing prepared environment, set `TUTORLOOP_PYTHON` to its executable instead.

Install the resulting `dsh-tutorloop-0.1.0.tgz` through your DSH plugin manager's local-package installation. Its bundle patch inserts only TutorLoop's plugin row. Restart/reload the host as required by your DSH installation, open a conversation in your learning workspace, and select the **TutorLoop** view. If the panel says the workspace is not yet confirmed, send one message in that conversation and refresh the panel.

In chat, try:

> Help me learn from `notes/chapter-1.pdf`. First establish what I already know, then guide me through one short practice task. Wait for my answer before grading it.

Choose a learning goal in the panel. The included six exercises and eight method cards are labeled Chinese civil-service examples, not a complete question bank. Import your own materials or ask the DSH teacher to search for sources for another subject.

## Configuration and storage

The default needs no project path. Tools derive the workspace from the executing DSH session. Each workspace gets `.dsh-tutorloop/tutor.sqlite3`; reinstalling the npm package does not replace it. The browser can use only workspaces observed by the host or explicitly configured. This is a local-user plugin, not a multi-tenant authorization service.

Optional host composition settings:

```yaml
- id: tutorloop
  name: dsh-tutorloop
  config:
    # pythonPath: /absolute/path/to/prepared/python
    # workspacePath: /absolute/path/to/learning-workspace
    # dbPath: /absolute/path/to/existing/tutor.sqlite3
    language: zh  # zh, en, or auto; panel overrides persist per workspace
    timeoutMs: 30000
    materialTimeoutMs: 120000
```

`dbPath` deliberately shares a specified existing database, including a Local Tutor database; omit it for workspace isolation. `TUTORLOOP_HOME` relocates the managed Python environment. `projectPath` and `legacyToolNames` exist for the earlier adapter's migration, and are unnecessary for a new install. Import paths must stay inside the active workspace; file links cannot escape it. A folder import is bounded to 300 supported files.

The plugin never needs its own model API key. DSH's model may receive source excerpts and submitted work during teaching. Web search uses DDGS and contacts public source websites. Credentials, PDFs and learning databases are excluded from the npm package and this repository.

## Current limits

PDF ingestion preserves page text and metadata; it does not automatically reconstruct image-heavy questions, tables, answer sheets or a complete graded exam. Scans need OCR. Missing solutions are never filled in as official answers. Web snippets are not full articles or verified reference answers.

The teacher model can access reference answers through its tool context. The student API strips them before submission, but this is not a secure proctored-exam system. Subjective feedback is an instructional estimate and remains pending until the DSH teacher supplies validated feedback. Review scheduling tracks evidence; it does not certify mastery.

The independent backend, tool contracts, browser panel and package have automated tests. Live teaching quality with a particular provider/model and installation in your existing DSH profile require separate acceptance. No model credentials are bundled.

## Development

```sh
npm ci
python -m pip install -r backend/requirements.txt
npm run build
# Set TUTORLOOP_E2E=1 to include the real Python/tool integration test.
npm test
npm run test:python
npm run check:package
```

`TUTORLOOP_TEST_PYTHON` selects a prepared interpreter for integration tests and `test:python`. Tests create temporary databases. CI runs the real integration test on Windows and Linux. [Publishing and bots](docs/AUTOMATION.md) explains the manual npm workflow; pushing source does not publish a package.

Apache-2.0. See [LICENSE](LICENSE). DSH plugin packaging and native view integration were informed by [dsh-memoir](https://github.com/Qinling-Melon-Farmers/dsh-memoir); StudyHub interoperability was researched against [dsh-web-studyhub](https://github.com/EricWang1358/dsh-web-studyhub).
