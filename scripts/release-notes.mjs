import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const releaseTag = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/;

function versionFromTag(tag) {
  if (typeof tag !== 'string' || !releaseTag.test(tag)) throw new Error('RELEASE_TAG must be v + a valid package version');
  return tag.slice(1);
}

// Ignore headings inside fenced examples and HTML comments without changing line indexes.
function headings(lines, requireClosed = false) {
  const visible = lines.join('\n').replace(/<!--[\s\S]*?-->/g, comment => comment.replace(/[^\n]/g, '')).split('\n');
  const found = [];
  let fence;
  for (const [index, line] of visible.entries()) {
    if (fence) {
      const close = /^ {0,3}(`+|~+)[ \t]*$/.exec(line);
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length) fence = undefined;
      continue;
    }
    const open = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (open && (open[1][0] !== '`' || !open[2].includes('`'))) {
      fence = open[1];
      continue;
    }
    const heading = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/.exec(line);
    if (heading) found.push({ index, level: heading[1].length, text: (heading[2] ?? '').replace(/[ \t]+#+[ \t]*$/, '').trim() });
  }
  if (requireClosed && fence) throw new Error('Unclosed Markdown fence in release changelog');
  return found;
}

function requireEntries(text, language, tag) {
  const visible = text.replace(/<!--[\s\S]*?-->/g, '');
  const lines = visible.split('\n');
  const headingLines = new Set(headings(lines, true).map(heading => heading.index));
  const nonempty = lines.some((line, index) => {
    if (headingLines.has(index) || /^ {0,3}(?:`{3,}|~{3,})/.test(line)) return false;
    const content = line.replace(/^\s*(?:[-+*]|\d+[.)])(?:[ \t]+|$)/, '').replace(/^\[[ xX]\](?:[ \t]+|$)/, '');
    return /[\p{L}\p{N}]/u.test(content);
  });
  if (!nonempty) throw new Error(`Empty ${language} changelog entries for ${tag}`);
}

export function extractReleaseNotes(changelog, tag) {
  const version = versionFromTag(tag);
  const lines = changelog.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  const allHeadings = headings(lines);
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exactVersion = new RegExp(`^(?:v?${escaped}|\\[v?${escaped}\\])(?=$|[ \\t（(])`);
  const matches = allHeadings.filter(heading => heading.level === 2 && exactVersion.test(heading.text));
  if (matches.length !== 1) throw new Error(`${matches.length ? 'Duplicate' : 'Missing'} exact changelog version ${version}`);
  const start = matches[0].index;
  const end = allHeadings.find(heading => heading.index > start && heading.level <= 2)?.index ?? lines.length;
  const section = lines.slice(start + 1, end);
  const languages = headings(section, true).filter(heading => heading.level === 3);
  const chinese = languages.filter(heading => heading.text === '中文');
  const english = languages.filter(heading => /^English(?: notes)?$/i.test(heading.text));
  if (chinese.length > 1 || english.length > 1) throw new Error(`Duplicate language section for ${tag}`);
  if (!english.length) throw new Error(`Missing English changelog section for ${tag}`);
  // Historical entries used unheaded Chinese followed by "### English notes".
  if (!chinese.length && !/^English notes$/i.test(english[0].text)) throw new Error(`Missing Chinese changelog section for ${tag}`);
  if (chinese.length && chinese[0].index > english[0].index) throw new Error(`Chinese must precede English for ${tag}`);
  const zh = section.slice(chinese.length ? chinese[0].index + 1 : 0, english[0].index).join('\n').trim();
  const en = section.slice(english[0].index + 1).join('\n').trim();
  requireEntries(zh, 'Chinese', tag);
  requireEntries(en, 'English', tag);
  return { chinese: zh, english: en };
}

export function buildReleaseNotes(changelog, { tag, repository }) {
  const version = versionFromTag(tag);
  if (typeof repository !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('GITHUB_REPOSITORY must be owner/repo');
  const notes = extractReleaseNotes(changelog, tag);
  return `## 本次更新

${notes.chinese}

<details>
<summary>English</summary>

${notes.english}

</details>

## 安装 / Installation

[npm ${version}](https://www.npmjs.com/package/dsh-tutorloop/v/${version}) · [使用说明 / Guide](https://github.com/${repository}/tree/${encodeURIComponent(tag)}#readme)

\`\`\`sh
dsh plugin --profile web add dsh-tutorloop@${version}
npx --yes --package=dsh-tutorloop@${version} dsh-tutorloop setup
\`\`\`

需要 / Requires: DSH 0.2.1-rc.2, Node 22.19+ or 24+, Python 3.11+.

附件直接下载自 npm，已核对 SHA512；与 npm 安装内容一致。
The attached tarball is downloaded from npm and verified against its SHA512 integrity.
`;
}

export function main({ tag = process.env.RELEASE_TAG, repository = process.env.GITHUB_REPOSITORY } = {}) {
  versionFromTag(tag);
  // Always use the tagged file, even if the checkout's CHANGELOG has been edited.
  const changelog = execFileSync('git', ['show', `refs/tags/${tag}:CHANGELOG.md`], { encoding: 'utf8', windowsHide: true });
  process.stdout.write(buildReleaseNotes(changelog, { tag, repository }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
