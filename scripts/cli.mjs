#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { PACKAGE_ROOT, runtimeHome, venvPython, resolveRuntime } from './runtime.mjs'

function run(executable, args, capture = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { shell: false, windowsHide: true, stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit', env: { ...process.env, PYTHONUTF8: '1' } })
    let output = ''
    if (capture) { child.stdout.on('data', c => { output += c }); child.stderr.resume() }
    child.once('error', () => reject(new Error('Python could not start. Pass --python with the path to Python 3.11+.')))
    child.once('close', code => code === 0 ? resolve(output) : reject(new Error(`Python exited with code ${code}. Run dsh-tutorloop setup --python <executable>.`)))
  })
}

async function main() {
  const [command = 'help', ...args] = process.argv.slice(2)
  if (!['help', 'setup', 'doctor'].includes(command)) throw new Error('Unknown command. Use setup, doctor or help.')
  let pythonPath
  for (let i = 0; i < args.length; i++) {
    if (args[i] !== '--python' || !args[i + 1] || pythonPath) throw new Error('Supported option: --python <one executable path>')
    pythonPath = args[++i]
  }
  if (command === 'help') {
    console.log('TutorLoop — guided practice in DeepSeek Harness\n\n  dsh-tutorloop setup [--python <executable>]\n  dsh-tutorloop doctor [--python <executable>]\n\nSetup creates an isolated Python environment; installation itself never runs pip.\nSet TUTORLOOP_PYTHON to use your own prepared environment. Set TUTORLOOP_HOME to relocate the managed environment.\nLearning records live in <session workspace>/.dsh-tutorloop, outside the npm package.')
    return
  }
  if (command === 'setup') {
    const base = pythonPath || process.env.TUTORLOOP_PYTHON || 'python'
    await run(base, ['-c', 'import sys; assert sys.version_info >= (3,11), "Python 3.11+ required"'])
    const home = runtimeHome()
    mkdirSync(home, { recursive: true })
    const managed = venvPython(home)
    if (!existsSync(managed)) await run(base, ['-m', 'venv', join(home, 'venv')])
    await run(managed, ['-m', 'pip', 'install', '-r', join(PACKAGE_ROOT, 'backend', 'requirements.txt')])
    console.log('TutorLoop backend ready. The plugin discovers this environment automatically. No DSH configuration was changed.')
  }
  const runtime = await resolveRuntime(command === 'setup' ? { pythonPath: venvPython() } : pythonPath ? { pythonPath } : {})
  const version = await run(runtime.pythonPath, ['-c', 'import sys; assert sys.version_info >= (3,11); import pydantic,requests,pypdf,docx,jieba,rank_bm25,ddgs; print(sys.version.split()[0])'], true)
  console.log(`Python ${version.trim()}: required backend imports passed.\nBackend: ${runtime.backendPath}\nWorkspace: ${runtime.workspacePath}\nLearning database: ${runtime.dbPath}\nThis check does not call a model or create a learning database.`)
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
