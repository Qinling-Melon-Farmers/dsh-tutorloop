import { isAbsolute, resolve, relative, sep, extname, join } from 'node:path'
import { realpath } from 'node:fs/promises'
import { readFileSync, writeFileSync, mkdirSync, readdirSync, renameSync, unlinkSync, lstatSync } from 'node:fs'
import { homedir } from 'node:os'
import { createHash, randomUUID } from 'node:crypto'
import { STUDENT_ACTIONS } from './actions.js'

export const PUBLIC_ACTIONS = new Set(STUDENT_ACTIONS)

function key(path) {
  let full = resolve(path)
  if (process.platform !== 'win32') return full
  // Extended Windows paths and their ordinary spelling identify one grant.
  if (/^\\\\\?\\UNC\\/i.test(full)) full = '\\\\' + full.slice(8)
  else if (/^\\\\\?\\[a-z]:\\/i.test(full)) full = full.slice(4)
  return full.toLowerCase()
}

/**
 * Workspace trust with a per-user store of previously host-confirmed
 * workspaces, so a DSH restart does not relock panels on workspaces the
 * user already worked in. Only host-side touches (tool calls or session
 * prompts) add entries; the store lives in the user's own profile
 * directory and is equivalent to configuring workspacePath explicitly.
 * Legacy JSON remains readable; new confirmations use independent atomic
 * entries in `<store>.d`, so concurrent hosts cannot overwrite one another.
 * Revoke all persistent grants by deleting BOTH the legacy file and entry
 * directory, then restarting hosts (already running hosts retain memory).
 */
export function createWorkspaceTrust(config = {}) {
  const seen = new Set()
  if (config.workspacePath) seen.add(key(config.workspacePath))
  const store = config.trustStore ?? join(homedir(), '.dsh-tutorloop', 'trusted-workspaces.json')
  const entries = `${store}.d`
  const addSaved = value => {
    if (typeof value === 'string' && isAbsolute(value)) seen.add(key(value))
  }
  const parse = path => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
  try {
    const saved = parse(store)
    if (Array.isArray(saved.workspaces)) for (const item of saved.workspaces) addSaved(item)
  } catch { /* first run or unreadable store: start empty */ }
  try {
    if (lstatSync(entries).isSymbolicLink()) throw new Error('Trust entry directory must not be a symlink')
    for (const entry of readdirSync(entries, { withFileTypes: true })) {
      if (!entry.isFile()) continue
      const filename = entry.name
      if (!/^[a-f0-9]{64}\.json$/.test(filename)) continue
      try {
        const saved = parse(join(entries, filename))
        // An entry must name exactly the workspace its filename identifies.
        if (typeof saved.workspace === 'string' && isAbsolute(saved.workspace)
          && filename === `${createHash('sha256').update(key(saved.workspace)).digest('hex')}.json`) addSaved(saved.workspace)
      } catch { /* a corrupt entry cannot grant trust */ }
    }
  } catch { /* no independent entries yet */ }
  const persist = item => {
    let temporary
    try {
      mkdirSync(entries, { recursive: true })
      if (lstatSync(entries).isSymbolicLink()) throw new Error('Trust entry directory must not be a symlink')
      const filename = `${createHash('sha256').update(item).digest('hex')}.json`
      temporary = join(entries, `.${randomUUID()}.tmp`)
      writeFileSync(temporary, JSON.stringify({ workspace: item }), { flag: 'wx', mode: 0o600 })
      renameSync(temporary, join(entries, filename))
    } catch { /* best effort; in-memory trust still works this session */ }
    finally { if (temporary) { try { unlinkSync(temporary) } catch {} } }
  }
  return {
    touch(path) {
      if (typeof path === 'string' && isAbsolute(path)) {
        const item = key(path)
        if (!seen.has(item)) { seen.add(item); persist(item) }
      }
    },
    allows(path) { return typeof path === 'string' && isAbsolute(path) && seen.has(key(path)) },
    defaultPath: config.workspacePath || process.cwd(),
  }
}

function fail(status, message) { return Object.assign(new Error(message), { status }) }
function json(res, status, body) {
  if (res.destroyed || res.writableEnded) return
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' })
  res.end(JSON.stringify(body))
}
async function readBody(req, max) {
  return new Promise((resolveBody, reject) => {
    let bytes = 0, chunks = [], settled = false
    const finish = (error, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      error ? reject(error) : resolveBody(value)
    }
    const timer = setTimeout(() => finish(fail(408, '请求超时。')), 30000)
    req.on('data', chunk => {
      bytes += chunk.length
      if (bytes > max) { chunks = []; finish(fail(413, '请求体超过限制。')); return }
      if (!settled) chunks.push(chunk)
    })
    req.on('error', () => finish(fail(400, '请求读取失败。')))
    req.on('aborted', () => finish(fail(400, '请求已取消。')))
    req.on('end', () => {
      if (settled) return
      try { finish(undefined, JSON.parse(Buffer.concat(chunks).toString('utf8'))) } catch { finish(fail(400, '请求必须为JSON对象。')) }
    })
  })
}

function validateOrigin(req) {
  if (req.headers['sec-fetch-site'] === 'cross-site') throw fail(403, '拒绝跨站请求。')
  const origin = req.headers.origin
  if (!origin) return // Local CLI clients have no browser Origin; workspace trust still applies.
  let parsed
  try { parsed = new URL(origin) } catch { throw fail(403, 'Origin无效。') }
  const protocol = req.socket?.encrypted ? 'https:' : 'http:'
  if (parsed.origin !== `${protocol}//${req.headers.host}`) throw fail(403, '请求必须与宿主同源。')
}

async function localImportPath(payload, cwd, folder) {
  if (typeof payload.path !== 'string' || !payload.path) throw fail(400, '请提供工作区内资料路径。')
  const root = await realpath(cwd)
  const path = await realpath(resolve(cwd, payload.path))
  const rel = relative(root, path)
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw fail(403, '只能导入当前工作区内的资料。')
  if (!folder && !new Set(['.pdf', '.docx', '.txt', '.md', '.csv', '.html', '.htm']).has(extname(path).toLowerCase())) throw fail(400, '不支持此资料文件类型。')
  return { ...payload, path }
}

export function createActionRoute(request, trust, config = {}) {
  return { kind: 'exact', path: '/api/dsh-tutorloop/action', handler: async (req, res) => {
    const controller = new AbortController()
    const cancel = () => { if (!res.writableEnded) controller.abort() }
    res.once('close', cancel)
    try {
      if (req.method !== 'POST') throw fail(405, '仅支持POST。')
      validateOrigin(req)
      if (!(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) throw fail(415, '请使用application/json。')
      const body = await readBody(req, config.maxRequestBytes ?? 1024 * 1024)
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail(400, '请求必须为JSON对象。')
      if (!PUBLIC_ACTIONS.has(body.action)) throw fail(403, '此动作仅供教师工具使用或不存在。')
      let payload = body.payload ?? {}
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw fail(400, 'payload必须为对象。')
      const cwd = body.cwd ?? trust.defaultPath
      if (!trust.allows(cwd)) throw fail(403, '工作区尚未由当前宿主会话确认。')
      if (body.action === 'import_file' || body.action === 'import_folder') payload = await localImportPath(payload, cwd, body.action === 'import_folder')
      const action = body.action === 'public_state' ? 'student_state' : body.action
      const data = await request(action, payload, controller.signal, { cwd })
      json(res, 200, { ok: true, data })
    } catch (error) {
      json(res, error.status ?? 400, { ok: false, error: error.message || '教学动作失败。' })
    } finally { res.removeListener('close', cancel) }
  } }
}
