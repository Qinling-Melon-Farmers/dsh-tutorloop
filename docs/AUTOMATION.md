# Repository automation

TutorLoop uses GitHub Actions and Dependabot. Routine automation needs only GitHub's built-in `GITHUB_TOKEN`; no model API key, bot account, or npm publish token is required. Workflows and settings are distinct: committing these files does not configure branch protection, GitHub deployment environments, or npm trusted publishing.

## Continuous integration

`CI` runs on pull requests, pushes to `main`, and manual dispatch. Its Linux and Windows jobs use Node 24 and Python 3.12, install the locked npm dependencies and backend requirements, build the native client, run Node and Python tests, and verify the npm package allowlist. `TUTORLOOP_E2E=1` enables the real bundled-Python workflow tests using temporary databases. The tests do not require an LLM account or a running DSH installation.

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

## Manual npm release

`Publish to npm` runs only through `workflow_dispatch` on `main`. Pushing a commit or tag does not publish anything. It requires the requested version to match `package.json`, repeats the build/tests/package check, and targets the GitHub environment named `npm` (configure its protection rules separately). Release builds disable setup-node package caching. Only this workflow grants `id-token: write`, for npm OIDC; it does not use a stored npm publish token.

The workflow checks that the bundled npm CLI supports trusted publishing (npm 11.5.1 or later). Node 24 is used in the runner. See the official [npm trusted publishing requirements and configuration](https://docs.npmjs.com/trusted-publishers/) and [setup-node release-cache guidance](https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md).

### First publication bootstrap

For a package that has never been published, a maintainer must first establish the package under their npm account using an explicitly authorized local publication. Trusted-publisher configuration is available in that package's npm settings, so an unregistered name alone does not make the committed workflow ready to publish. Check the current npm UI before release; publishing is a separate decision from pushing repository source.

Suggested maintainer sequence (instructions only; repository setup does not execute these commands):

1. Verify ownership/name availability and the exact `repository.url`, inspect the tested tarball, and complete the first local publication with npm login/2FA when ready. For example, publish the reviewed `dsh-tutorloop-<version>.tgz` using `npm publish <tarball> --access public`. Follow npm's [first public package publication guide](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/).
2. Create a GitHub environment named **npm**, allow deployment from **main** only, and add a required reviewer where the repository plan supports it. Prefer preventing self-review for release approvals.
3. In the npm package's Settings → Trusted publishing, configure GitHub Actions with owner **Qinling-Melon-Farmers**, repository **dsh-tutorloop**, workflow filename **publish.yml**, and environment **npm**. These fields must match exactly. No `NPM_TOKEN` or `NODE_AUTH_TOKEN` repository secret is needed for this public package.
4. Bump to a new, unpublished version, merge reviewed changes to `main`, and manually run **Publish to npm** with that exact version. Do not retry a published version as a new release.
5. Review the npm result and provenance, then review npm's option to restrict traditional token publication after OIDC works. Follow the current npm guidance for any publisher-validation deadline.

This repository has not published a package merely by adding the workflow. GitHub environment and npm account configuration must be completed by a maintainer with those permissions.

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

Set `TUTORLOOP_E2E=1` when Python dependencies are installed to run bundled-backend Node tests as CI does. The automation tests exercise form classification, safe treatment of hostile prose, advisory duplicate suggestions, and idempotent bot-comment updates using mocked GitHub APIs. They never contact GitHub or publish npm packages.

中文说明：CI、每周依赖更新和 Issue 引导已随代码配置；机器人只提示，不自动关闭 Issue/PR。npm 发布只能手动触发，还需要维护者配置 GitHub 的 npm 环境及 npm Trusted Publisher。首次建包需要单独确认并完成本地发布；本次提交和推送不会发布 npm 包。
