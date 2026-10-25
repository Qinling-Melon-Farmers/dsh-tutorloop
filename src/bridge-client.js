import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { resolveRuntime } from '../scripts/runtime.mjs'
import { STUDENT_ACTIONS, TEACHER_ACTIONS } from './actions.js'

export const ACTIONS = new Set([...STUDENT_ACTIONS, ...TEACHER_ACTIONS])

export function createBridge(config = {}) {
  const language = config.language ?? process.env.TUTORLOOP_LANGUAGE ?? 'zh'
  if (!['zh', 'en', 'auto'].includes(language)) throw new Error('language须为zh、en或auto。')
  const timeoutMs = config.timeoutMs ?? 30000
  const materialTimeoutMs = config.materialTimeoutMs ?? config.timeoutMs ?? 120000
  const maxOutputBytes = config.maxOutputBytes ?? 4 * 1024 * 1024
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || !Number.isFinite(materialTimeoutMs) || materialTimeoutMs < 1 || !Number.isFinite(maxOutputBytes) || maxOutputBytes < 1) throw new Error('timeoutMs/materialTimeoutMs/maxOutputBytes 必须为正数。')
  return async function request(action, payload = {}, signal, execution = {}) {
    if (!ACTIONS.has(action)) return Promise.reject(new Error('未知教学 bridge action。'))
    if (signal?.aborted) return Promise.reject(signal.reason ?? new Error('教学请求已取消。'))
    const runtime = await resolveRuntime(config, { cwd: execution.cwd })
    const { backendPath, pythonPath, dbPath, workspacePath, scopeSource } = runtime
    if (!existsSync(join(backendPath, 'bridge.py'))) throw new Error('教学内核 bridge.py 不存在，请检查安装。')
    signal?.throwIfAborted()
    const scope = { workspacePath, source: scopeSource }
    return new Promise((resolve, reject) => {
      let failure, stdout = '', bytes = 0
      const child = spawn(pythonPath, ['-X', 'utf8', join(backendPath, 'bridge.py')], {
        cwd: backendPath, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, TUTORLOOP_LANGUAGE: language, TUTOR_DB_PATH: dbPath, TUTOR_WORKSPACE_PATH: workspacePath, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
      })
      const stop = (error) => { failure ??= error; child.kill() }
      const abort = () => stop(signal.reason ?? new Error('教学请求已取消。'))
      const budget = ['import_file', 'import_folder', 'search_materials', 'fetch_material'].includes(action) ? materialTimeoutMs : timeoutMs
      const timer = setTimeout(() => stop(new Error('教学 bridge 超时。')), budget)
      signal?.addEventListener('abort', abort, { once: true })
      if (signal?.aborted) abort()
      child.stdout.setEncoding('utf8')
      child.stdout.on('data', chunk => {
        bytes += Buffer.byteLength(chunk)
        if (bytes > maxOutputBytes) stop(new Error('教学 bridge 输出超过限制。'))
        else stdout += chunk
      })
      // Drain diagnostics, but never expose Python stderr or inherited secrets to the model.
      child.stderr.on('data', () => {})
      child.stdin.on('error', () => {})
      child.on('error', () => { failure ??= new Error('无法启动 Python；请检查 pythonPath 和本地环境。') })
      child.on('close', code => {
        clearTimeout(timer)
        signal?.removeEventListener('abort', abort)
        if (failure) return reject(failure)
        if (code !== 0) return reject(new Error(`教学 bridge 退出失败（${code}）。`))
        let response
        try { response = JSON.parse(stdout) } catch { return reject(new Error('教学 bridge 未返回单个有效 JSON 响应。')) }
        if (!response || typeof response !== 'object' || typeof response.ok !== 'boolean') return reject(new Error('教学 bridge 响应不符合协议。'))
        if (!response.ok) return reject(new Error(typeof response.error === 'string' ? response.error : '教学 bridge 拒绝请求。'))
        if (!Object.hasOwn(response, 'data')) return reject(new Error('教学 bridge 响应缺少 data。'))
        const data = response.data
        resolve(Array.isArray(data) ? { items: data, scope } : data !== null && typeof data === 'object' ? { ...data, scope } : { value: data, scope })
      })
      try { child.stdin.end(JSON.stringify({ action, payload }) + '\n') } catch { stop(new Error('教学请求无法序列化。')) }
    })
  }
}
