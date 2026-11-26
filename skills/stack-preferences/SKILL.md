---
name: stack-preferences
description: How the user likes to build software and what they usually use - backend, database, frontend, monorepo and tooling, deployment and CI/CD, observability, testing, AI engineering, mobile, ways of working and git - with the best practices that go with each choice. Use when starting or scaffolding a project, creating its repo, picking a library, framework, provider or tool, adding a new capability or surface to a project, setting up deployment or CI, or whenever a "what should we use for this?" decision comes up.
---

# Stack preferences

How the user likes to build software and what they usually use, decided in advance, so a new project starts without explaining it again. Each area file holds the choices for that area, why each one was made, and when to deviate from it.

## When it applies

Any choice you would otherwise make alone or ask about: a library, a framework, a database, a provider, a host, a CI setup, a repo setting, a way of working. It applies to new projects and to new parts of existing ones.

It does not override what is already there. In a project whose stack is already set, or whose own instructions say otherwise, match the project. If it is unclear which applies, ask.

## How to use it

1. Read the file for the area you are working on, not all of them.
2. Work from the preferences. They are the starting point, not something to argue again each time.
3. Still weigh what fits. When you think something else is better for this project, because it meets a "deviate when" condition or for another concrete reason, say so with the reason and ask before switching. Never switch silently.
4. When an area has no preference for the choice at hand, choose by current best practice, say that no preference exists for it yet, and offer to add one.
5. No version pins. These are choices of library, not of version; use the current stable version at install time.

## Areas

| File | Covers |
|---|---|
| [backend.md](references/backend.md) | Server framework, databases, validation, config, auth, API layer and shape |
| [frontend.md](references/frontend.md) | Web framework, routing, data fetching, state, forms, tables, styling, i18n and RTL |
| [monorepo-and-tooling.md](references/monorepo-and-tooling.md) | Repo layout, package manager, shared packages, TypeScript config, lint and format, local dev |
| [deployment-and-ci.md](references/deployment-and-ci.md) | Hosting, infrastructure as code, CI/CD |
| [observability.md](references/observability.md) | Logging, error tracking, uptime, tracing |
| [testing.md](references/testing.md) | Test tools, what gets tested and how |
| [ai-engineering.md](references/ai-engineering.md) | Models, SDKs, agent loops, prompts, evals |
| [mobile.md](references/mobile.md) | Native and mobile apps |
| [ways-of-working-and-git.md](references/ways-of-working-and-git.md) | Git workflow, PRs, repo settings |

## Adding an area or a preference

This skill lives in the user's claude-kit repo and is installed as a plugin, so the installed copy is overwritten on update. Change it in the repo, through a PR.

- A new preference goes in its area's file: the choice, one line on why it beat the alternative, and when to deviate from it. A choice with no stated trigger for reconsidering it is one nobody can safely question later.
- A new area gets its own file under `references/` and a row in the table above.
