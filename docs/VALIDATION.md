# Validation record

Date: 2026-10-25. Version: 0.1.0.

## Automated checks

- 71 Python tests cover the teaching workflow, frozen grading contracts, persistence, source handling, workspace-bound imports (including Windows short-path aliases), language preferences and mocked model/network failures.
- Node tests cover child-process behavior, tool contracts, browser/host action boundaries, native view lifecycle, language persistence and the real bundled-Python teaching flow. The integration test must be enabled with `TUTORLOOP_E2E=1` or `TUTORLOOP_TEST_PYTHON`.
- Three mocked GitHub automation tests cover advisory issue guidance. Five release tests cover tag/lock/git checks, prereleases, registry identity and errors, bounded waiting and SHA512 verification. The bot does not close issues or require private data.
- The 17 tool input/output schemas were checked against the installed DSH 0.2.1-rc.2 schema validator.
- Package inspection uses an explicit allowlist; no downloaded papers, learning databases, credentials, virtual environments or desktop automation scripts are shipped.

## Local execution

Windows: Node 24 and Python 3.12.7. The setup command created a separate virtual environment; doctor passed. A fresh npm installation of the tarball ran the bundled backend, created an isolated workspace database, hid teacher-only fields and graded an objective example. The browser bundle rendered in headless Microsoft Edge in both light and dark modes with no page errors. Native view interactions are covered by the component tests; this does not claim a full browser-driven examination run.

Ubuntu 20.04.3 under WSL: the existing DSH installation reports 0.2.1-rc.2, with Node 22.23.2. System Python 3.8.10 is too old; an existing Miniconda Python 3.13.11 successfully created a separate temporary virtual environment. The tarball loaded, doctor passed, and a real Node → Python flow set an English-learning goal, imported a text source, retrieved it, created a frozen exercise, submitted an answer and saved validated 10-point feedback. Student state hid the reference answer. Existing DSH/Memoir files and settings were not changed.

CI repeats build, Node/real-backend tests, Python tests and package inspection on Windows and Linux. Ubuntu 20.04 is a local compatibility check; the hosted Linux runner uses `ubuntu-latest` and is not presented as a 20.04-specific runner.

## npm publication

Version 0.1.0 was published with maintainer login/2FA on 2026-10-25. The public registry SHA512 matches the reviewed local tarball, and `npx --yes --package=dsh-tutorloop@0.1.0 dsh-tutorloop help` passed from outside the source checkout. Its tag-triggered workflow passed on Windows/Linux and created a GitHub Release; the downloaded GitHub asset also matches npm's SHA512. This initial local publication does not have GitHub Actions provenance.

The 0.1.1 tag passed both platforms but publication failed before npm authentication: a relative tarball path without `./` was parsed as GitHub shorthand (exit 128). The version was not published. The path was corrected for 0.1.2 and checked with `npm publish ./release-assets/dsh-tutorloop-0.1.1.tgz --dry-run`; the original failed tag is retained. The maintainer configured npm Trusted Publisher; the new tag's Release run is the acceptance check for OIDC.

## Still requires acceptance

- Installing and using the plugin in the user's active DSH profile; local contract/component tests do not replace this check.
- Teaching quality and subjective feedback with a real provider/model. No paid model calls or credentials were used in these tests.
- Visual accuracy of diagrams, tables or scanned PDFs; extraction is text-based.
