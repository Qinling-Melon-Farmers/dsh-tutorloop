import test from 'node:test'
import assert from 'node:assert/strict'
import { createUpdateStatus, mainWorkspaceCwd } from '../src/client/plugin-info.js'

const stable = (version, extra = {}) => ({ version, bundle: true, prerelease: false, tags: ['latest'], ...extra })
const listed = versions => ({ ok: true, value: { status: 'listed', installed: '0.5.0', versions } })
test('host update checks coalesce, cache and respect compatibility and stable channel', async () => {
  const status = createUpdateStatus('dsh-tutorloop', '0.5.0')
  let resolve, calls = 0
  status.setManager({ listVersions: (name, options) => {
    assert.equal(name, 'dsh-tutorloop'); assert.deepEqual(options, {}); calls++
    return new Promise(r => { resolve = r })
  } })
  const first = status.check(); const second = status.check()
  assert.equal(first, second); assert.equal(calls, 1)
  resolve(listed([stable('0.6.0-alpha.1', { prerelease: true }), stable('0.5.2', { incompatible: {} }), stable('0.5.1')]))
  await first
  assert.deepEqual(status.getSnapshot(), { phase: 'available', version: '0.5.1' })
  await status.check(); assert.equal(calls, 1)
  const forced = status.check(true); resolve(listed([stable('0.5.2', { incompatible: {} })])); await forced
  assert.equal(status.getSnapshot().phase, 'incompatible')
})
test('failed or stale checks never claim current or overwrite a replacement host', async () => {
  const status = createUpdateStatus('dsh-tutorloop', '0.5.0')
  let resolve
  status.setManager({ listVersions: () => new Promise(r => { resolve = r }) })
  const obsolete = status.check()
  status.setManager({ listVersions: async () => { throw Error('offline') } })
  await status.check(); assert.equal(status.getSnapshot().phase, 'unknown')
  resolve(listed([])); await obsolete; assert.equal(status.getSnapshot().phase, 'unknown')
  status.setManager({ listVersions: async () => ({ ok: true, value: { status: 'listed', installed: '0.4.1', versions: [] } }) })
  await status.check(); assert.equal(status.getSnapshot().phase, 'unknown')
  status.setManager(null); await status.check(); assert.equal(status.getSnapshot().phase, 'unavailable')
})
test('main panel never selects an arbitrary workspace or a sidebar session', () => {
  const selected = { cwd: '/study', retainedBy: { mainView: 1 } }
  const other = { cwd: '/private', retainedBy: { sidebar: 1 } }
  assert.equal(mainWorkspaceCwd({ byId: { other } }), '')
  assert.equal(mainWorkspaceCwd({ byId: { selected, other } }), '/study')
  assert.equal(mainWorkspaceCwd({ byId: { selected, second: selected } }), '')
})
