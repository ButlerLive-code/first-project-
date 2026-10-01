// `npm run dev`: starts the API server and Vite together and stops both when
// either exits or on Ctrl+C. A small script instead of an extra dependency.
import { spawn } from 'node:child_process'
import { devPorts } from './dev-ports.mjs'

try {
  process.loadEnvFile('.env')
} catch {
  // .env is optional; defaults work for local development.
}

const ports = devPorts(process.env)
const isWindows = process.platform === 'win32'
const processes = [
  ['api', process.execPath, ['--watch', 'server/index.ts']],
  ['web', isWindows ? 'npx.cmd' : 'npx', ['vite', '--port', ports.web, '--strictPort']],
]

let stopping = false
const children = processes.map(([name, command, args]) => {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: isWindows,
    env: { ...process.env, API_PORT: ports.api },
  })
  child.on('exit', (code) => {
    if (!stopping) console.log(`[dev] ${name} stopped (exit code ${code ?? 0}); stopping the other one`)
    stopAll(code ?? 0)
  })
  return child
})

function stopAll(code) {
  if (stopping) return
  stopping = true
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM')
  process.exitCode = code
}

process.on('SIGINT', () => stopAll(0))
process.on('SIGTERM', () => stopAll(0))
