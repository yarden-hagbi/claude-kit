import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import { whoami } from '../hooks/register'

// Stands for the engine and the host: gh's account, the folder's git email, and the status line.
function engine(on: On, w: { gh?: string; git?: string }) {
  const status: (string | undefined)[] = []
  on('session.cwd', () => ({ value: '/work' }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.status', (_, e) => (status.push(e.text), { value: undefined }))
  on('process.run', (_, e) => {
    const stdout = e.argv[0] === 'gh' ? w.gh : w.git
    return { value: { exitCode: stdout ? 0 : 1, stdout: stdout ?? '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  return status
}

test('the status line shows the gh user and the git email', async ($, on) => {
  const status = engine(on, { gh: 'octocat', git: 'octo@example.com' })
  await $.session.start({ cwd: '/work', surface: 'desktop', isInteractive: true })
  expect(status.at(-1)).toBe('octocat / octo@example.com')
})

test('a Bash call looks again, so a gh switch shows up', async ($, on) => {
  const w = { gh: 'octocat', git: 'octo@example.com' }
  const status = engine(on, w)
  on('tool.call', () => ({ result: {} }))
  await $.session.start({ cwd: '/work', surface: 'desktop', isInteractive: true })
  w.gh = 'monalisa'
  await $.tool.call({ tool: 'Bash', command: 'gh auth switch' })
  expect(status.at(-1)).toBe('monalisa / octo@example.com')
})

test('with neither gh nor git set, the status line is cleared', async ($, on) => {
  const status = engine(on, {})
  await $.session.start({ cwd: '/work', surface: 'desktop', isInteractive: true })
  expect(status).toEqual([undefined])
})

test('a missing part is left out', () => {
  expect(whoami('octocat', undefined)).toBe('octocat')
  expect(whoami(undefined, 'octo@example.com')).toBe('octo@example.com')
})

test('a command that is not installed is left out, not an error', async ($, on) => {
  const status: (string | undefined)[] = []
  on('session.cwd', () => ({ value: '/work' }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.status', (_, e) => (status.push(e.text), { value: undefined }))
  on('process.run', (_, e) => {
    // gh is not installed: the command cannot start, so the call rejects.
    if (e.argv[0] === 'gh') throw new Error('spawn gh ENOENT')
    return { value: { exitCode: 0, stdout: 'octo@example.com\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  await $.session.start({ cwd: '/work', surface: 'desktop', isInteractive: true })
  expect(status.at(-1)).toBe('octo@example.com')
})
