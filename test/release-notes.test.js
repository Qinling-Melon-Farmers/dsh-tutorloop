import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReleaseNotes, extractReleaseNotes } from '../scripts/release-notes.mjs';

const repository = 'Qinling-Melon-Farmers/dsh-tutorloop';
const section = (version, chinese = '- 修复本版教学流程。', english = '- Fix this version\'s teaching flow.') =>
  `## ${version}（2026-10-27）\n\n### 中文\n\n${chinese}\n\n### English\n\n${english}\n`;

test('extracts only the exact stable version, excluding newer, previous and grouped entries', () => {
  const changelog = '# 更新日志\n\n' + section('1.2.30', '- 更新版。') + '\n' + section('1.2.3') + '\n' + section('1.2.2', '- 上一版。') + '\n## 0.1.x\n\n- 合并历史。\n';
  assert.deepEqual(extractReleaseNotes(changelog, 'v1.2.3'), {
    chinese: '- 修复本版教学流程。', english: '- Fix this version\'s teaching flow.',
  });
  const body = buildReleaseNotes(changelog, { tag: 'v1.2.3', repository });
  assert.doesNotMatch(body, /更新版|上一版|合并历史|1\.2\.30|1\.2\.2/);
});

for (const version of ['1.2.3-rc.1', '1.2.3-beta.2+build.5', '1.2.3+build.4']) {
  test(`matches the complete prerelease/build version ${version}`, () => {
    const changelog = section('1.2.3') + '\n' + section(version, '- 预发布修复。', '- Prerelease fix.') + '\n' + section('1.2.2');
    assert.equal(extractReleaseNotes(changelog, `v${version}`).chinese, '- 预发布修复。');
    const body = buildReleaseNotes(changelog, { tag: `v${version}`, repository });
    assert.ok(body.includes(`dsh-tutorloop@${version}`));
    assert.ok(body.includes(`/tree/${encodeURIComponent(`v${version}`)}#readme`));
    assert.throws(() => extractReleaseNotes(changelog, `v${version}.1`), /Missing exact changelog version/);
  });
}

for (const heading of ['## 1.2.3（未发布）', '## 1.2.3 (2026-10-27)', '## v1.2.3', '## [1.2.3] - 2026-10-27', '## [v1.2.3] ###']) {
  test(`accepts an exact version heading: ${heading}`, () => {
    const changelog = section('1.2.3').replace(/^.*\n/, heading + '\n');
    assert.equal(extractReleaseNotes(changelog, 'v1.2.3').chinese, '- 修复本版教学流程。');
  });
}

test('normalizes BOM and CRLF and supports historical English notes', () => {
  const changelog = '\uFEFF## 1.2.3（历史）\r\n\r\n- 历史中文修复。\r\n\r\n### English notes\r\n\r\n- Historical fix.\r\n';
  assert.deepEqual(extractReleaseNotes(changelog, 'v1.2.3'), { chinese: '- 历史中文修复。', english: '- Historical fix.' });
});

test('does not fall back to grouped, partial or other version entries', () => {
  for (const changelog of ['## 0.1.x\n\n- 合并历史。', section('1.2.30'), section('1.2.3-rc.1'), section('1.2.3+build.1'), section('1.2.2'), '']) {
    assert.throws(() => extractReleaseNotes(changelog, 'v1.2.3'), /Missing exact changelog version/);
  }
  assert.throws(() => extractReleaseNotes('## 0.1.x\n\n- 历史。', 'v0.1.2'), /Missing exact changelog version/);
});

test('rejects invalid tags and ambiguous duplicate versions/languages', () => {
  for (const tag of [undefined, '', '1.2.3', 'v01.2.3', 'v1.2.3-01', 'v1.2.3\nother', '--help']) {
    assert.throws(() => extractReleaseNotes(section('1.2.3'), tag), /RELEASE_TAG/);
  }
  assert.throws(() => extractReleaseNotes(section('1.2.3') + '\n' + section('1.2.3'), 'v1.2.3'), /Duplicate exact changelog version/);
  for (const duplicate of ['### 中文', '### English', '### English notes']) {
    assert.throws(() => extractReleaseNotes(section('1.2.3') + `\n${duplicate}\n\n- Duplicate.`, 'v1.2.3'), /Duplicate language section/);
  }
});

test('requires both Chinese and English sections and does not borrow from the next version', () => {
  assert.throws(() => extractReleaseNotes('## 1.2.3\n\n### 中文\n\n- 中文。\n\n' + section('1.2.2'), 'v1.2.3'), /Missing English/);
  assert.throws(() => extractReleaseNotes('## 1.2.3\n\n### English\n\n- English.', 'v1.2.3'), /Missing Chinese/);
  assert.throws(() => extractReleaseNotes('## 1.2.3\n\n' + section('1.2.2'), 'v1.2.3'), /Missing English/);
  assert.throws(() => extractReleaseNotes('## 1.2.3\n\n### English\n\n- English.\n\n### 中文\n\n- 中文。', 'v1.2.3'), /Chinese must precede English/);
});

for (const empty of ['', ' \n\t ', '- ', '- [ ]', '1. ', '<!-- 待补充 / TODO -->', '#### Fixes\n\n---', '```js\n```']) {
  test(`rejects empty or markup-only language entries: ${JSON.stringify(empty)}`, () => {
    assert.throws(() => extractReleaseNotes(section('1.2.3', empty), 'v1.2.3'), /Empty Chinese changelog entries/);
    assert.throws(() => extractReleaseNotes(section('1.2.3', '- 中文。', empty), 'v1.2.3'), /Empty English changelog entries/);
    assert.throws(() => extractReleaseNotes(`## 1.2.3\n\n${empty}\n\n### English notes\n\n- Fix.`, 'v1.2.3'), /Empty Chinese changelog entries/);
  });
}

test('respects Markdown fence boundaries, comments and nested headings', () => {
  const chinese = '- 保留代码示例。\n\n````md\n## 1.2.3\n### English\n```\n````\n\n#### 细节\n\n- 补充说明。';
  const english = '- Keep examples.\n\n~~~md\n## 1.2.2\n### 中文\n~~~';
  const changelog = '<!--\n' + section('1.2.3') + '\n-->\n' + section('1.2.3', chinese, english) + '\n## Unreleased\n\n- Excluded.';
  assert.deepEqual(extractReleaseNotes(changelog, 'v1.2.3'), { chinese, english });
  assert.throws(() => extractReleaseNotes(section('1.2.3', '- 中文。', '- Fix.\n\n```js\nconst x = 1;'), 'v1.2.3'), /Unclosed Markdown fence/);
});

test('renders Chinese first, closed English details, valid Markdown spacing and preserved installation metadata', () => {
  const body = buildReleaseNotes(section('1.2.3', '- **修复** [说明](https://example.invalid/fix)。', '- **Fix** `submission` handling.'), { tag: 'v1.2.3', repository });
  assert.match(body, /^## 本次更新\n\n- \*\*修复\*\*/);
  assert.match(body, /\n\n<details>\n<summary>English<\/summary>\n\n- \*\*Fix\*\* `submission` handling\.\n\n<\/details>\n\n## 安装/);
  assert.equal((body.match(/<details>/g) ?? []).length, 1);
  assert.equal((body.match(/<\/details>/g) ?? []).length, 1);
  assert.ok(body.includes('[npm 1.2.3](https://www.npmjs.com/package/dsh-tutorloop/v/1.2.3)'));
  assert.ok(body.includes(`[使用说明 / Guide](https://github.com/${repository}/tree/v1.2.3#readme)`));
  assert.match(body, /\n\n```sh\ndsh plugin --profile web add dsh-tutorloop@1\.2\.3\nnpx --yes --package=dsh-tutorloop@1\.2\.3 dsh-tutorloop setup\n```\n\n/);
  assert.ok(body.includes('DSH 0.2.1-rc.2, Node 22.19+ or 24+, Python 3.11+.'));
  assert.ok(body.includes('附件直接下载自 npm，已核对 SHA512；与 npm 安装内容一致。'));
  assert.ok(body.includes('The attached tarball is downloaded from npm and verified against its SHA512 integrity.'));
  assert.ok(body.endsWith('\n'));
  for (const invalid of [undefined, '', 'https://github.com/owner/repo', 'owner/repo/extra', 'owner/repo\n<script>']) {
    assert.throws(() => buildReleaseNotes(section('1.2.3'), { tag: 'v1.2.3', repository: invalid }), /GITHUB_REPOSITORY/);
  }
});

test('CLI reads the tag snapshot rather than the working tree and fails without partial notes', () => {
  const tempRoot = realpathSync(tmpdir());
  const directory = mkdtempSync(join(tempRoot, 'tutorloop-release-notes-'));
  const script = fileURLToPath(new URL('../scripts/release-notes.mjs', import.meta.url));
  const git = args => execFileSync('git', args, { cwd: directory, encoding: 'utf8', windowsHide: true });
  const run = tag => spawnSync(process.execPath, [script], {
    cwd: directory, encoding: 'utf8', windowsHide: true,
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, RELEASE_TAG: tag, GITHUB_REPOSITORY: repository },
  });
  try {
    git(['init', '--quiet']);
    writeFileSync(join(directory, 'CHANGELOG.md'), section('1.2.3', '- 来自 tag 的修复。', '- Tagged fix.') + '\n' + section('1.2.4', '- 中文。', ''));
    git(['-c', 'core.autocrlf=false', 'add', 'CHANGELOG.md']);
    git(['-c', 'user.name=Release notes tests', '-c', 'user.email=release-tests@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'Release notes fixture']);
    for (const tag of ['v1.2.3', 'v1.2.4', 'v1.2.5']) git(['-c', 'tag.gpgSign=false', 'tag', tag]);
    writeFileSync(join(directory, 'CHANGELOG.md'), section('1.2.3', '- 不应读取工作树。', '- Working tree content.'));
    const success = run('v1.2.3');
    assert.equal(success.error, undefined);
    assert.equal(success.status, 0, success.stderr);
    assert.match(success.stdout, /来自 tag 的修复/);
    assert.doesNotMatch(success.stdout, /不应读取工作树|Working tree content/);
    for (const [tag, message] of [['v1.2.4', /Empty English/], ['v1.2.5', /Missing exact changelog version/]]) {
      const failure = run(tag);
      assert.equal(failure.status, 1);
      assert.equal(failure.stdout, '');
      assert.match(failure.stderr, message);
    }
  } finally {
    // Verify the absolute target remains in this test's temporary directory.
    assert.equal(dirname(resolve(directory)), tempRoot);
    rmSync(directory, { recursive: true, force: true });
  }
});

test('publish validates notes before npm operations and preserves existing Releases and assets', () => {
  const workflow = readFileSync(new URL('../.github/workflows/publish.yml', import.meta.url), 'utf8').replace(/\r\n?/g, '\n');
  const prepare = workflow.indexOf('run: node scripts/release-notes.mjs > "$RUNNER_TEMP/tutorloop-release-notes.md"');
  assert.ok(prepare > workflow.indexOf('run: node scripts/release.mjs check'));
  assert.ok(prepare < workflow.indexOf('run: node scripts/release.mjs probe'));
  assert.ok(prepare < workflow.indexOf('run: npm publish'));
  assert.match(workflow, /if gh release view[^\n]+; then\n\s+echo [^\n]+\n\s+exit 0\n\s+fi/);
  assert.match(workflow, /gh release create "\$RELEASE_TAG" "\$RELEASE_ASSET"/);
  assert.ok(workflow.includes('--notes-file "$RUNNER_TEMP/tutorloop-release-notes.md"'));
  assert.doesNotMatch(workflow, /gh release (?:delete|edit)|--clobber|TutorLoop 学习陪练 \/ guided learning/);
  const ci = readFileSync(new URL('../scripts/ci-check.mjs', import.meta.url), 'utf8');
  assert.ok(ci.includes("['--test', 'test/*.test.js']"), 'Existing CI automatically includes this release test file');
});
