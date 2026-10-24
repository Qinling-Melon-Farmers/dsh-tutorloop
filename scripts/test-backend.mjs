import { spawn } from 'node:child_process'
import { PACKAGE_ROOT } from './runtime.mjs'
import { join } from 'node:path'
const child = spawn(process.env.TUTORLOOP_TEST_PYTHON || process.env.TUTORLOOP_PYTHON || 'python', ['-X', 'utf8', '-m', 'unittest', 'discover', '-s', 'tests', '-v'], { cwd: join(PACKAGE_ROOT, 'backend'), stdio: 'inherit', shell: false, windowsHide: true })
child.on('error', error => { console.error(error.message); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
