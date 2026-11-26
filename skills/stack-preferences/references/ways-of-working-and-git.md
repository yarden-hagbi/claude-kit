# Ways of working and git

## Git workflow

- **Always a PR, even solo. Always squash merge.** `main` stays a linear history of one commit per PR.
- **No rigid commit format** — no mandatory `feat:`/`fix:` prefixes. Write a clear, imperative subject; add a body when the change isn't self-explanatory.

## GitHub — repo settings

Apply these when the repo is created, before the first PR.

1. **`RAILWAY_TOKEN` in Actions secrets.** A Railway project token, used by the deploy step in CI (`deployment-and-ci.md`). `gh secret set RAILWAY_TOKEN`
2. **Squash merge only.** Settings → General → Pull Requests: disable merge commits and rebase merging, keep squash. Enforces the linear `main` from the git workflow instead of relying on picking the right button. `gh repo edit --enable-squash-merge --enable-merge-commit=false --enable-rebase-merge=false`
3. **Protect `main` — changes only through a PR**, no direct commit + push. A ruleset (Settings → Rules → Rulesets) on the default branch with *Require a pull request before merging*. Traps:
   - Required approvals **0** — solo, you can't approve your own PR, so 1 locks you out.
   - Keep yourself **off the bypass list**, or the rule doesn't apply to you as owner.
   - A **private** repo on GitHub Free doesn't enforce rulesets — needs Pro, or a public repo.
