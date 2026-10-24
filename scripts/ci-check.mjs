// Preserve test diagnostics as public job annotations when a runner fails.
// Only fixed repository checks are accepted; no user-provided shell commands.
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { PACKAGE_ROOT } from './runtime.mjs'
const checks = {
  node: [process.execPath, ['--test', 'test/*.test.js'], PACKAGE_ROOT],
  bots: [process.execPath, ['--test', '.github/tests/*.test.cjs'], PACKAGE_ROOT],
  python: [process.env.TUTORLOOP_TEST_PYTHON || 'python', ['-X', 'utf8', '-m', 'unittest', 'discover', '-s', 'tests', '-v'], join(PACKAGE_ROOT, 'backend')],
}
const name = process.argv[2]
if (!Object.hasOwn(checks, name)) throw new Error('Unknown CI check')
const [command, args, cwd] = checks[name]
const child = spawn(command, args, { cwd, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
let tail = ''
function record(chunk, stream) {
  stream.write(chunk)
  tail = (tail + chunk.toString('utf8')).slice(-10000)
}
child.stdout.on('data', chunk => record(chunk, process.stdout))
child.stderr.on('data', chunk => record(chunk, process.stderr))
child.once('error', error => { tail += error.message; process.exitCode = 1 })
child.once('close', code => {
  if (code !== 0) {
    const diagnostics = tail.split('\n').filter(line => !/ \.\.\. ok\s*$/.test(line) && !/^✔/.test(line)).join('\n').slice(-4000)
    const escaped = diagnostics.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A')
    console.error(`::error title=TutorLoop ${name} check::${escaped}`)
    process.exitCode = code || 1
  }
})
