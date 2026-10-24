import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

if (!process.env.npm_execpath) throw new Error('Run this check with npm run check:package.')
const output = execFileSync(process.execPath, [process.env.npm_execpath, 'pack', '--dry-run', '--ignore-scripts', '--json'], { encoding: 'utf8', windowsHide: true })
const [pack] = JSON.parse(output)
const paths = pack.files.map(f => f.path)
const allowed = /^(package\.json|README(?:\.en)?\.md|LICENSE|cordis\.patch\.yml|lib\/client\.js|src\/[^/]+\.js|backend\/README\.md|backend\/bridge\.py|backend\/requirements\.txt|backend\/tutor\/[^/]+\.py|backend\/data\/(seed_catalog|method_cards)\.json|scripts\/(runtime|cli)\.mjs|docs\/[^/]+\.md)$/
for (const path of paths) assert.match(path, allowed, `Unexpected package file: ${path}`)
for (const required of ['src/index.js', 'src/server.js', 'lib/client.js', 'scripts/cli.mjs', 'scripts/runtime.mjs', 'backend/bridge.py', 'backend/tutor/materials.py', 'backend/data/seed_catalog.json', 'backend/data/method_cards.json', 'backend/requirements.txt', 'cordis.patch.yml', 'LICENSE']) {
  assert.ok(paths.includes(required), `Missing required package file: ${required}`)
}
const manifest = JSON.parse(readFileSync('package.json', 'utf8'))
assert.equal(pack.name, 'dsh-tutorloop')
assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')
assert.equal(manifest.exports['./client'], './lib/client.js')
console.log(`Verified ${paths.length} allowlisted package files (${pack.size} compressed bytes); no PDFs, databases, local environments or credentials.`)
