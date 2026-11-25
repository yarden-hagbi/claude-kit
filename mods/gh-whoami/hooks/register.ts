import type { EngineInterface, Register } from 'claude-code'

async function out($: EngineInterface, argv: string[], cwd: string): Promise<string | undefined> {
  const r = await $.process.run(argv, { cwd, timeoutMs: 5000 }).catch(() => undefined)
  return r?.exitCode === 0 ? r.stdout.trim() || undefined : undefined
}

/** `<gh user> / <git email>`, leaving out a part that has nothing to show. */
export function whoami(gh: string | undefined, git: string | undefined): string | undefined {
  return [gh, git].filter(Boolean).join(' / ') || undefined
}

async function refresh($: EngineInterface): Promise<void> {
  const cwd = await $.session.cwd()
  const [gh, git] = await Promise.all([
    // Reads gh's local config: no network call.
    out($, ['gh', 'config', 'get', '-h', 'github.com', 'user'], cwd),
    // The folder's own identity, includeIf and repo config applied.
    out($, ['git', 'config', 'user.email'], cwd),
  ])
  // The status line under the prompt, labelled with this mod's name.
  $.ui.status(whoami(gh, git))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await refresh($)
    // gh can be switched from another session or a terminal: look again now and then.
    $.clock.every(30_000, () => void refresh($))
    return started
  })

  // A Bash call may switch gh or change folder: look again once it has run.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    await refresh($)
    return ran
  })
}
