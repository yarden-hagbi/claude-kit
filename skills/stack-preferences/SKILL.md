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
| `references/backend.md` | NestJS structure, Postgres + Drizzle, MongoDB + Mongoose, zod, config, better-auth, error format, API shape, oRPC |
| `references/frontend.md` | React + Vite, routing, TanStack Query, nuqs, forms, tables, Tailwind + shadcn, folder structure, mobile-first web, i18n and the Hebrew/RTL bundle |
| `references/monorepo-and-tooling.md` | pnpm + Turborepo layout, `packages/contracts`, TypeScript config, Biome, local dev |
| `references/deployment-and-ci.md` | Railway topology, Caddy, the traps, `.railway/railway.ts`, CI/CD with GitHub Actions |
| `references/observability.md` | The day-one baseline, then Sentry, uptime and OpenTelemetry, and when each one enters |
| `references/testing.md` | Vitest, Playwright, what gets tested, tests that touch the database |
| `references/ai-engineering.md` | Nothing decided yet |
| `references/mobile.md` | Native and mobile apps. Nothing decided yet |
| `references/ways-of-working-and-git.md` | Git workflow, GitHub repo settings |

## Cross-cutting rules

These span more than one area, so they apply even without opening a file. Each one is explained in the file named next to it.

- One source of truth: an enum, type or schema is defined once and derived everywhere. Write the `as const` tuple first, then derive zod and `pgEnum` from it. (`monorepo-and-tooling.md`)
- One origin: web and API on the same domain, so no CORS and a first-party cookie. (`frontend.md`, `deployment-and-ci.md`)
- `strict: true` and `noUncheckedIndexedAccess`. (`monorepo-and-tooling.md`)
- Migrations from committed files, reviewed in the PR and run pre-deploy. Never `push`. (`backend.md`)
- `timestamptz` only. `snake_case` in Postgres, `camelCase` in TS. (`backend.md`)
- PATCH: absent means don't touch, explicit `null` means clear. (`backend.md`)
- Errors carry a `code` that is the i18n key, an English `message` for developers that is never shown to users, and the HTTP status in the body. With oRPC, use its own shape. (`backend.md`)
- A zod env schema that throws at boot, so a missing env var fails the deploy. (`backend.md`)
- Self-signup off in anything internal. A global auth guard, with `@Public()` for the exceptions. (`backend.md`)

## Adding an area or a preference

This skill lives in the user's claude-kit repo and is installed as a plugin, so the installed copy is overwritten on update. Change it in the repo, through a PR.

- A new preference goes in its area's file, in the shape already there: the choice, one line on why it beat the alternative, and when to deviate from it. A choice with no stated trigger for reconsidering it is one nobody can safely question later.
- A rule that spans areas also gets one line under "Cross-cutting rules".
- A new area gets its own file under `references/` and a row in the table above.
