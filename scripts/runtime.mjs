import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export function runtimeHome(env = process.env) {
  const value = env.TUTORLOOP_HOME || join(homedir(), '.cache', 'dsh-tutorloop')
  if (!isAbsolute(value)) throw new Error('TUTORLOOP_HOME must be an absolute path.')
  return value
}

export function venvPython(home = runtimeHome()) {
  return join(home, 'venv', process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'python.exe' : 'python')
}

export async function resolveRuntime(config = {}, { cwd } = {}) {
  const selected = cwd || config.workspacePath || process.cwd()
  if (typeof selected !== 'string' || !isAbsolute(selected)) throw new Error('Workspace must be an absolute path.')
  const workspacePath = resolve(selected)
  const backendPath = config.projectPath ?? process.env.GONGKAO_TUTOR_PROJECT ?? join(PACKAGE_ROOT, 'backend')
  if (typeof backendPath !== 'string' || !isAbsolute(backendPath) || !existsSync(join(backendPath, 'bridge.py'))) {
    throw new Error('The bundled backend is missing or projectPath is invalid.')
  }
  const configuredPython = config.pythonPath ?? process.env.TUTORLOOP_PYTHON ?? process.env.GONGKAO_TUTOR_PYTHON
  const cachedPython = venvPython()
  const pythonPath = configuredPython ?? (existsSync(cachedPython) ? cachedPython : 'python')
  if (typeof pythonPath !== 'string' || !pythonPath.trim()) throw new Error('pythonPath must name one executable.')
  const dbPath = config.dbPath ?? join(workspacePath, '.dsh-tutorloop', 'tutor.sqlite3')
  if (typeof dbPath !== 'string' || !isAbsolute(dbPath)) throw new Error('dbPath must be an absolute path.')
  return { workspacePath, backendPath, pythonPath, dbPath: resolve(dbPath), scopeSource: cwd ? 'execution' : config.workspacePath ? 'config' : 'process' }
}
