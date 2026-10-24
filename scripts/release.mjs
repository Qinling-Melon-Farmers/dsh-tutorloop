import { readFile, appendFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash, timingSafeEqual } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const registry = 'https://registry.npmjs.org/';
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/;

export function normalizeRepository(repository) {
  const url = typeof repository === 'string' ? repository : repository?.url;
  if (typeof url !== 'string' || !url) throw new Error('Missing repository URL');
  return url.replace(/^git\+/, '').replace(/\/$/, '').replace(/\.git$/, '');
}

export function checkRelease(pkg, lock, tag, git = args => execFileSync('git', args, { encoding: 'utf8' }).trim()) {
  const match = semver.exec(pkg.version);
  if (!match || tag !== `v${pkg.version}`) throw new Error('RELEASE_TAG must equal v + a valid package version');
  if (lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version) throw new Error('package-lock version mismatch');
  const head = git(['rev-parse', 'HEAD']);
  if (git(['rev-parse', '--verify', `refs/tags/${tag}^{commit}`]) !== head) throw new Error('Release tag does not point to HEAD');
  git(['merge-base', '--is-ancestor', head, 'refs/remotes/origin/main']);
  return { version: pkg.version, tag, dist_tag: match[4] ? 'next' : 'latest', prerelease: String(Boolean(match[4])) };
}

export function validateMetadata(metadata, pkg) {
  if (metadata.name !== pkg.name || metadata.version !== pkg.version) throw new Error('Registry package name/version mismatch');
  if (normalizeRepository(metadata.repository) !== normalizeRepository(pkg.repository)) throw new Error('Registry repository mismatch');
  return metadata;
}

export async function registryVersion(pkg, fetcher = fetch) {
  const response = await fetcher(`${registry}${encodeURIComponent(pkg.name)}/${encodeURIComponent(pkg.version)}`, { signal: AbortSignal.timeout(15000), redirect: 'error' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Registry request failed: HTTP ${response.status}`);
  return validateMetadata(await response.json(), pkg);
}

export async function waitForVersion(pkg, { fetcher = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), attempts = 31, interval = 10000 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const metadata = await registryVersion(pkg, fetcher);
    if (metadata) return metadata;
    if (attempt + 1 < attempts) await sleep(interval);
  }
  throw new Error('Timed out waiting for npm registry visibility');
}

export async function downloadAsset(metadata, fetcher = fetch) {
  const url = new URL(metadata.dist?.tarball);
  if (url.origin !== new URL(registry).origin || url.protocol !== 'https:' || url.username || url.password) throw new Error('Tarball must be hosted on registry.npmjs.org');
  const integrity = metadata.dist?.integrity;
  if (typeof integrity !== 'string' || !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(integrity)) throw new Error('Expected SHA512 integrity');
  const response = await fetcher(url.href, { signal: AbortSignal.timeout(30000), redirect: 'error' });
  if (!response.ok) throw new Error(`Tarball request failed: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const expected = Buffer.from(integrity.slice(7), 'base64');
  const actual = createHash('sha512').update(bytes).digest();
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new Error('Tarball integrity mismatch');
  return bytes;
}

async function output(values) {
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n';
  process.stdout.write(lines);
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, lines);
}

export async function main(command = process.argv[2]) {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  if (command === 'check') {
    const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
    await output(checkRelease(pkg, lock, process.env.RELEASE_TAG));
  } else if (command === 'probe') {
    await output({ exists: String(Boolean(await registryVersion(pkg))) });
  } else if (command === 'asset') {
    const metadata = await waitForVersion(pkg);
    const bytes = await downloadAsset(metadata);
    const filename = `${pkg.name.replace(/^@/, '').replaceAll('/', '-')}-${pkg.version}.tgz`;
    await mkdir('release-assets', { recursive: true });
    const path = `release-assets/${filename}`;
    await writeFile(path, bytes);
    await output({ asset: path });
  } else throw new Error('Usage: node scripts/release.mjs check|probe|asset');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
