# claude-kit

My personal Claude Code skills and mods.

## Install

```bash
claude plugin marketplace add yarden-hagbi/claude-kit
claude plugin install hagbi@hagbi
```

`hagbi` is one plugin with all the skills. They run with its prefix, for example `/hagbi:manager`. Each mod is a separate plugin:

```bash
claude plugin install rtl-claude-desktop@hagbi
claude plugin install gh-whoami@hagbi
```

## Update

```bash
claude plugin marketplace update hagbi
claude plugin update hagbi@hagbi
```

Run `claude plugin update` once for each plugin you installed, then start a new session. To update automatically, turn on auto-update for `hagbi` in `/plugin` > Marketplaces.

No plugin sets a `version`, so every commit on `main` is an update.

## Layout

- `skills/<name>/` holds skills I wrote, all packaged in the `hagbi` plugin.
- `mods/<name>/` holds mods, each loaded as a plugin.

Work-related skills and third-party skills do not belong here.

## Skills

- `manager`: turns a session into the project's manager, which plans the roadmap and runs a separate session for each item.

## Mods

- `rtl-claude-desktop`: right-aligns Claude Desktop replies that mix Hebrew and English.
- `gh-whoami`: shows the active `gh` account and the folder's git email in the status line.
