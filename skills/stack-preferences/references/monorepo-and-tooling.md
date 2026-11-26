# Monorepo & tooling

**pnpm workspaces + Turborepo.** *Deviate to a plain single repo when* there's a single app and no shared package.

## Layout

```
apps/api                nest
apps/web                vite
packages/contracts      zod schemas + enums + route contracts
.railway/railway.ts     Railway IaC
tsconfig.base.json      root, not a package
eslint.config.js        root, not a package
turbo.json
pnpm-workspace.yaml
docker-compose.yml      postgres only
```

**pnpm** — strict `node_modules` means a package can't import what it didn't declare, which is exactly the bug that bites in monorepos. Workspace protocol for internal deps.

**No `packages/config`** — with two apps, a config package is indirection for what a root file already does.

**No `packages/db`** — only the API touches Postgres; the schema lives in `apps/api/src/db`.

## `packages/contracts`

```
packages/contracts/
  enums.ts       the closed enums — ONE source of truth
  errors.ts      the ErrorCode union + response shape
  common.ts      pagination · uuid · phone · timestamps
  <resource>.ts  schemas + route contracts, one file per resource
```

The highest-return piece of the whole setup: closed enums are defined here once and both sides derive from them. **Write the literal tuple first and derive zod from it** — `pgEnum()` needs a tuple, and zod 4's `.options` is a plain array, so the other direction doesn't compile:

```ts
export const priorities = ['low', 'medium', 'high', 'urgent'] as const;
export const prioritySchema = z.enum(priorities);
export type Priority = z.infer<typeof prioritySchema>;
// and on the DB side: pgEnum('priority', priorities)
```

Adding a value → TypeScript shows every place that needs updating, including the missing i18n key.

**Contracts hold API shapes, not DB rows.** The frontend never sees a column name.

**Compile it, don't ship source.** Turborepo promotes just-in-time packages (export raw `.ts`); that's fine with Vite and rough with Nest — its build and the deploy need the source pulled in via path mappings, and it breaks in ways that only show up at deploy time.

- **`tsc` emits `dist` + `.d.ts`** — not a bundler. `contracts` is schemas with one dependency, and tsup's `.d.ts` step hardcodes `baseUrl`, which recent TypeScript rejects with no config override. A bundler buys nothing here.
- turbo's `dependsOn: ["^build"]` handles ordering
- `tsc --watch --preserveWatchOutput` in dev
- **ESM only** when `engines.node` is modern — `require()` of ESM works, so a second CJS output earns nothing

## turbo.json

| Task | Notes |
|---|---|
| `build` | `dependsOn: ["^build"]`, declare `outputs` |
| `dev` | persistent, `cache: false` |
| `typecheck` | a separate task — the linter shouldn't do the compiler's job |
| `db:generate` / `db:migrate` / `db:seed` | |

**Declare `env` in `turbo.json`.** Otherwise the cache returns a build made with the wrong `DATABASE_URL`.

## TypeScript

| Setting | Value |
|---|---|
| `strict` | `true` |
| `noUncheckedIndexedAccess` | `true` — the highest-return flag in an app full of optional fields and array access |
| `moduleResolution` | `bundler` for web, `nodenext` for api |

**The native compiler (`tsgo`) is significantly faster**, and Nest is fine on it — a Nest app with `emitDecoratorMetadata` and constructor injection compiles and boots. **The thing that blocks it is typescript-eslint**, which throws on import against TS >= 7 and is waiting on async parser support in ESLint. On Biome that constraint doesn't exist, so take the new compiler. Still **verify a Nest build on day one** rather than at file 50.

## Lint & format

**Biome.** One binary for lint and format, one config file, no plugin version roulette — and it never touches `tsc`, so the native compiler is available. It also leaves markdown alone, which is what you want for Hebrew prose: Prettier's table alignment pads by character count and mangles RTL tables.

Start from the defaults. The config worth writing is short:

```json
{
  "$schema": "https://biomejs.dev/schemas/<version>/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "javascript": { "parser": { "unsafeParameterDecoratorsEnabled": true } },
  "linter": {
    "rules": {
      "nursery": { "noFloatingPromises": "error", "noMisusedPromises": "error" }
    }
  },
  "overrides": [
    { "includes": ["apps/api/**"],
      "linter": { "rules": { "style": { "useImportType": "off" } } } }
  ]
}
```

Four things that are not optional in a Nest repo:

1. **`unsafeParameterDecoratorsEnabled`** — without it Biome's parser rejects `constructor(@Inject(DB) private db: Db)` outright.
2. **`useImportType` off for the API.** The rule rewrites `import { SomeService }` to `import type` because a constructor parameter is a type position. The import is erased at runtime, `emitDecoratorMetadata` writes `design:paramtypes: [Function]`, and Nest fails to resolve the dependency. **It compiles and lints clean, and only breaks at boot.** Leave the rule on everywhere else.
3. **Turn on `noFloatingPromises` and `noMisusedPromises`** once there is async code. They're nursery and `info` by default — i.e. off — and a missed `await` inside a transaction is a silent data bug.
4. **Lint is not a turbo task.** One binary over the whole repo takes milliseconds; per-package tasks are ceremony.

**What this costs:** Biome's type-aware rules are young — the `types` domain is mostly nursery, against a mature set in typescript-eslint. That's the trade. *Deviate to ESLint when* a project's correctness leans on type-aware linting more than on tooling simplicity.

For Hebrew apps, the physical-property ban is a GritQL plugin — see *The Hebrew/RTL bundle* in `frontend.md`.

## Local dev

| Topic | Decision |
|---|---|
| Docker | **Postgres only.** Apps run on the host so HMR works. Full-docker kills HMR and then nobody uses it |
| PG version | Pin the same major as production |
| Volume | Named volume so data survives `down`. Healthcheck so `db:up` can wait |
| Port | Consider **5433** on the host if a native Postgres exists — the collision is a 20-minute mystery |
| Dev loop | `pnpm dev` → turbo runs `contracts` (`tsc --watch`), `api` (3000), `web` (5173 + proxy) |
| Env | `.env` per app + a committed `.env.example` |

**A seed script is part of the setup path, not a nice-to-have.** With self-signup off, a fresh clone with an empty database has no way to log in. `db:seed` creates the first user, and ideally a little realistic data — every UI decision is easier to judge against real content than against an empty state.
