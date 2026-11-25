# gh-whoami

Shows who you are on GitHub before you push or open a PR. Claude Code's status line, under the prompt, shows `gh-whoami  <gh user> / <git email>`: the account the GitHub CLI is on (`gh config get -h github.com user`, read locally with no network call) and the git email for the session's folder (`git config user.email`, so `includeIf` and repo config apply). It looks again at session start, after every Bash call and every 30 seconds, so a `gh auth switch` from another terminal shows up. A part with nothing to show is left out. It needs no setup and blocks nothing.
