const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const api = import('../../scripts/release.mjs');
const pkg = { name: 'example', version: '1.2.3', repository: { url: 'git+https://github.com/org/example.git' } };
const lock = { version: pkg.version, packages: { '': { version: pkg.version } } };
const metadata = { ...pkg, repository: 'https://github.com/org/example' };
const response = (status, value) => ({ status, ok: status === 200, json: async () => value });

test('release check validates tag, lock and git ancestry', async () => {
  const { checkRelease } = await api;
  const calls = [];
  const git = args => { calls.push(args); return 'abc'; };
  assert.deepEqual(checkRelease(pkg, lock, 'v1.2.3', git), { version: '1.2.3', tag: 'v1.2.3', dist_tag: 'latest', prerelease: 'false' });
  assert.deepEqual(calls[2], ['merge-base', '--is-ancestor', 'abc', 'refs/remotes/origin/main']);
  assert.throws(() => checkRelease(pkg, lock, 'v1.2.4', git), /RELEASE_TAG/);
  assert.throws(() => checkRelease(pkg, { ...lock, version: '0.0.0' }, 'v1.2.3', git), /lock/);
  assert.throws(() => checkRelease(pkg, lock, 'v1.2.3', () => { throw Error('git failure'); }), /git failure/);
  assert.throws(() => checkRelease(pkg, lock, 'v1.2.3', args => args.includes('HEAD') ? 'abc' : 'def'), /HEAD/);
  assert.throws(() => checkRelease(pkg, lock, 'v1.2.3', args => { if (args[0] === 'merge-base') throw Error('not ancestor'); return 'abc'; }), /not ancestor/);
});

test('SemVer prereleases use next and reject malformed versions', async () => {
  const { checkRelease } = await api;
  for (const version of ['1.2.3-rc.1', '1.2.3-alpha', '1.2.3-0+build.1']) {
    const result = checkRelease({ ...pkg, version }, { version, packages: { '': { version } } }, `v${version}`, () => 'abc');
    assert.equal(result.dist_tag, 'next');
    assert.equal(result.prerelease, 'true');
  }
  for (const version of ['01.2.3', '1.2.3-01', '1.2', '1.2.3-']) {
    assert.throws(() => checkRelease({ ...pkg, version }, lock, `v${version}`, () => 'abc'), /RELEASE_TAG/);
  }
});

test('registry treats only 404 as absent and validates identity', async () => {
  const { registryVersion } = await api;
  assert.equal(await registryVersion(pkg, async () => response(404)), null);
  for (const status of [403, 429, 500, 503]) await assert.rejects(registryVersion(pkg, async () => response(status)), new RegExp(String(status)));
  assert.equal(await registryVersion(pkg, async () => response(200, metadata)), metadata);
  for (const invalid of [{ ...metadata, name: 'other' }, { ...metadata, version: '9.0.0' }, { ...metadata, repository: 'https://github.com/other/repo' }]) {
    await assert.rejects(registryVersion(pkg, async () => response(200, invalid)), /mismatch/);
  }
  await assert.rejects(registryVersion(pkg, async () => { throw Error('network'); }), /network/);
});

test('polling is bounded and retries only missing versions', async () => {
  const { waitForVersion } = await api;
  let calls = 0;
  let sleeps = 0;
  await assert.rejects(waitForVersion(pkg, { attempts: 3, fetcher: async () => { calls++; return response(404); }, sleep: async () => { sleeps++; } }), /Timed out/);
  assert.equal(calls, 3);
  assert.equal(sleeps, 2);
  calls = 0;
  await assert.rejects(waitForVersion(pkg, { fetcher: async () => { calls++; return response(403); }, sleep: async () => assert.fail('must not retry') }), /403/);
  assert.equal(calls, 1);
  calls = 0;
  assert.equal(await waitForVersion(pkg, { fetcher: async () => response(++calls === 1 ? 404 : 200, metadata), sleep: async () => {} }), metadata);
});

test('asset uses registry tarball and verifies SHA512 bytes', async () => {
  const { downloadAsset } = await api;
  const bytes = Buffer.from('published package bytes');
  const dist = { tarball: 'https://registry.npmjs.org/example/-/example-1.2.3.tgz', integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}` };
  const fetcher = async () => ({ ok: true, arrayBuffer: async () => bytes });
  assert.deepEqual(await downloadAsset({ dist }, fetcher), bytes);
  await assert.rejects(downloadAsset({ dist: { ...dist, tarball: 'https://evil.example/package.tgz' } }, fetcher), /hosted/);
  await assert.rejects(downloadAsset({ dist: { ...dist, tarball: 'http://registry.npmjs.org/package.tgz' } }, fetcher), /hosted/);
  await assert.rejects(downloadAsset({ dist: { ...dist, integrity: 'sha512-YWJj' } }, fetcher), /integrity mismatch/);
  await assert.rejects(downloadAsset({ dist: { ...dist, integrity: 'sha1-YWJj' } }, fetcher), /SHA512/);
  await assert.rejects(downloadAsset({ dist }, async () => ({ ok: false, status: 500 })), /500/);
});
