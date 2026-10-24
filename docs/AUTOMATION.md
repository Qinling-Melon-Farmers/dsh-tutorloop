# Repository automation

TutorLoop uses GitHub Actions and Dependabot. Routine automation needs only GitHub's built-in `GITHUB_TOKEN`; no model API key, bot account, or npm publish token is required. Workflows and settings are distinct: committing these files does not configure branch protection, GitHub deployment environments, or npm trusted publishing.

## Continuous integration

`CI` runs on pull requests, pushes to `main`, manual dispatch, and as a reusable workflow for releases. Its Linux and Windows jobs use Node 24 and Python 3.12, install the locked npm dependencies and backend requirements, build the native client, run Node and Python tests, and verify the npm package allowlist. `TUTORLOOP_E2E=1` enables the real bundled-Python workflow tests using temporary databases. Release validation checks out the requested tag and disables dependency caches. The tests do not require an LLM account or a running DSH installation.

The package check rejects unexpected files and verifies required runtime assets. Both operating systems upload the tested npm tarball with a seven-day artifact retention period. A CI artifact is a reviewable build, not a publication. New commits cancel superseded CI runs; publishing is serialized and never canceled midway.

CI has read-only repository access and checkout does not persist Git credentials. Fork PR code runs only in that low-permission CI context. Official actions are pinned to full commit IDs resolved from their official major-version tags; Dependabot proposes future updates for review.

## Issue guidance

Bug and feature forms accept English or Chinese reports. Plain-text errors are sufficient; screenshots, code patches, and private learning records are never required. Blank issues remain enabled for questions and cases that do not fit a form.

`Issue guidance` uses a single inline `actions/github-script` step, with `issues: write` and no checkout. It reads event fields through `context.payload`, never inserts issue text into shell commands or script source, and never runs code supplied by an issue or PR. It can:

- Add `needs-triage` to a new report and classify the exact form values `Bug` or `Feature` as `bug` or `enhancement`. These labels are created if missing. Existing labels are preserved.
- Ask for empty bug/feature sections without requiring the reporter to write code, supply a screenshot, or reopen a new issue.
- Suggest up to three open issues with similar titles among the 100 most recently updated open reports. This heuristic can miss related issues and can suggest unrelated ones; it makes no duplicate decision.
- Update one marked bot comment after an edit, rather than post repeated reminders.

It never closes, locks, or deletes reports and never automatically applies a `duplicate` label. Maintainers decide whether reports are related. Label failures do not invalidate a report. The PR template invites relevant validation and privacy notes; documentation-only PRs are welcome and there is no automatic PR closure or mandatory screenshot bot.

These choices adapt Memoir's advisory issue guidance and human-reviewed related-issue suggestions. Memoir's stricter documentation-PR and contribution-evidence policies are not copied into TutorLoop.

## Dependency updates

`.github/dependabot.yml` checks npm development dependencies, Python backend requirements, and GitHub Actions weekly. Updates are grouped by ecosystem and remain ordinary PRs; nothing auto-merges. Maintainers should review changes, especially parser/network dependencies and action permission changes, and wait for CI.

## Tag → npm → GitHub Release

`Release` (`.github/workflows/publish.yml`) runs when a `v*` tag is pushed. Manual dispatch accepts an existing `tag` for recovery. It invokes the same Windows/Linux CI first, then checks that the tag is exactly `v` + the version in both package manifests, points to the checked-out commit, and belongs to `main` history. Ordinary commits do not publish packages.

The publish job uses the GitHub environment **npm** and grants `id-token: write` for npm OIDC, `actions: read` to download this run's tested Linux artifact, and `contents: write` to create a GitHub Release. It publishes that tested tarball with provenance, waits for public registry visibility, downloads and verifies npm's SHA512 tarball, then attaches those exact bytes to the GitHub Release. Stable versions use the npm `latest` tag; prereleases use `next` and GitHub's prerelease flag. Only this workflow has publication permissions.

If an npm version already exists, the workflow validates its package identity and repository, skips publication, and uses the registry tarball for the Release. This supports retries and the locally bootstrapped **0.1.0** without trying to overwrite an immutable npm version. Registry errors other than 404 fail explicitly. An existing GitHub Release is left unchanged. These rules do not claim that a local bootstrap has CI provenance.

### One-time npm configuration

Version **0.1.0** was published locally with maintainer login/2FA on 2026-10-25; public registry integrity and the downloaded CLI were verified. Future CI publishing requires a trusted-publisher connection in that package's npm settings:

| npm field | Value |
| --- | --- |
| Provider | GitHub Actions |
| Organization or user | `Qinling-Melon-Farmers` |
| Repository | `dsh-tutorloop` |
| Workflow filename | `publish.yml` |
| Environment name | `npm` |
| Allowed actions | Enable direct `npm publish` |

The filename and environment must match exactly. No npm token is stored in GitHub. Configure GitHub environment protection separately; if deployment ref restrictions are enabled, allow **tags matching `v*`** (and `main` for manual recovery). Allowing only the `main` branch blocks tag-triggered publication.

Current npm settings default new connections to staged publication. This workflow uses direct publication, so select the corresponding allowed action. npm also requires a new trusted publisher's first successful publication within two days; configure it when the next unpublished version is ready. Skipping an already published 0.1.0 does not validate OIDC. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) for the current settings and [setup-node release-cache guidance](https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md).

### Publishing subsequent versions

After reviewing changes and updating the version, push the commit and its matching tag:

```sh
npm version patch
git push origin main
git push origin --follow-tags
```

`npm version` updates both manifests and creates the version commit/tag. Do not move published tags. Monitor the **Release** workflow; success means public npm visibility and GitHub Release creation both completed. If a run fails after npm accepts publication, rerun it or manually dispatch with the same existing tag; the registry check prevents a duplicate publish.

## Recommended GitHub settings

After the first successful CI run, protect `main` with the observed Linux and Windows test checks, require a reviewed PR, and block force pushes/deletions. Keep default Actions workflow permissions read-only; issue and release jobs request only their explicit permissions. Enable dependency alerts and Dependabot security updates if available. Enable first-time external-contributor workflow approval as appropriate for a public repository. Review changes to `.github/workflows/` as privileged configuration.

These are recommendations, not settings silently applied by this repository. The `npm` environment's required reviewers and branch restrictions must also be configured in GitHub Settings; the YAML name alone does not add protection.

## Local automation checks

```sh
node --test .github/tests/*.test.cjs
npm run build
npm test
npm run test:python
npm run check:package
```

Set `TUTORLOOP_E2E=1` when Python dependencies are installed to run bundled-backend Node tests as CI does. Automation tests cover advisory issue guidance plus release tag/manifest checks, registry error handling, bounded visibility polling and tarball integrity using mocked network/git operations. They never contact GitHub or publish npm packages.

中文说明：推送版本 tag → Windows/Linux 检查 → npm 发布 → GitHub Release。已有版本会跳过重复发布，Release 附件使用 npm 原包并校验完整性。0.1.0 已通过本地登录发布；后续自动发布须在 npm 配置上表所列的 Trusted Publisher，并允许直接 `npm publish`。本地登录不会自动授予 GitHub Actions 发布权。Issue 机器人只提示，不自动关闭 Issue/PR。
