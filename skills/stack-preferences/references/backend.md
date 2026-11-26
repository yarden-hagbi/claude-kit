# Backend

What to use for each backend concern, and the conventions that go with it.

| Concern | Use | Notes |
|---|---|---|
| Framework | **NestJS** | A single endpoint or a script → plain Hono/Express instead |
| SQL database | **PostgreSQL + Drizzle** + drizzle-kit (`pg` driver) | The default. See *Postgres + Drizzle* below. *Deviate to Prisma when* it's pure simple CRUD with near-zero aggregation — its DX wins there |
| NoSQL database | **MongoDB + Mongoose** | Only for genuinely document-shaped data. See *MongoDB + Mongoose* below |
| Validation | **zod**, from the oRPC contract's `.input()` schema — no global pipe | **Never** class-validator, class-transformer, or DTO classes. Reach for `nestjs-zod` + a global `ZodValidationPipe` only on the plain-Nest path |
| Auth | **better-auth** + `@thallesp/nestjs-better-auth` | See *Auth* below |
| Config | `@nestjs/config` + a zod env schema that **throws at boot** | A missing or misspelled env var should fail the deploy with a readable message, not surface as a 500 at 11pm. See *Config* below |
| Logging | `nestjs-pino` as Nest's logger | **Never winston.** See `observability.md` |
| API layer | **oRPC** (`@orpc/nest`) | See *API layer* below |

**Why zod and not class-validator:** Nest's default is DTO classes with decorators. Mixing
that with zod means writing every shape twice. `nestjs-zod` gives the same ergonomics and
feeds Swagger if it's ever wanted.

## Config

`ConfigModule.forRoot({ isGlobal: true, cache: true, envFilePath, validate })`, where
`validate` is the zod parse. It throws before Nest finishes booting, so a bad environment is
a failed deploy rather than a runtime surprise, and one `.env` at the repo root serves both
apps and the standalone db scripts.

```ts
ConfigModule.forRoot({
  isGlobal: true,
  cache: true,
  envFilePath: '../../.env',
  validate: loadEnv,          // zod parse; throws with the offending keys listed
})
```

Read values through a **typed** `ConfigService`:

```ts
useFactory: (config: ConfigService<Env, true>) => createDb(config.get('DATABASE_URL', { infer: true }))
```

Both parts are load-bearing. The second type argument (`true`, "was validated") makes `get`
return `T` instead of `T | undefined`, and `{ infer: true }` is what picks the value's real
type off `Env` — `PORT` comes back `number`, not `any`. Annotate the parameter as
`ConfigService<Env, true>` at every injection site; without the annotation the call falls to
a different overload and stops type-checking.

## Module structure

| Topic | Decision |
|---|---|
| Modules | One per aggregate, mirroring the domain. The frontend's feature folders use the same names |
| Layers | **Controller → Service → data access, directly.** No repository interfaces, no domain entities, no use-cases |
| Exception | Heavy analytical queries go in their own `<resource>.queries.ts` — no business logic. It's what you'll actually iterate on, and it doesn't belong inside a service method |
| Prefix | Global `/api`. **No `/v1`** until there's an external consumer |
| Healthcheck | `/health` — the platform waits for it before switching traffic |

A generic repository layer over Drizzle (or Mongoose) reimplements it, worse. Don't build one.

## Postgres + Drizzle

| Topic | Decision |
|---|---|
| Schema location | `apps/api/src/db` |
| Migrations | `drizzle-kit generate` — SQL files committed, reviewed in the PR, run in pre-deploy. **Never `push`** (it eventually drops a column) |
| Primary keys | **UUID v4** via `gen_random_uuid()` |
| Naming | `snake_case` in Postgres, `camelCase` in TS (`casing: 'snake_case'`) |
| Timestamps | `timestamptz` only, never `timestamp` |
| Casing | Column names never reach the frontend — contracts hold API shapes |

**UUID v4** costs a little index locality (writes scatter through the B-tree instead of
appending) — unmeasurable below millions of rows. In exchange, `gen_random_uuid()` is built
into Postgres: no app-side library, no PG-version dependency. **Consequence: ids carry no
ordering**, so anything time-ordered sorts by `created_at`.

*Deviate to `bigserial` when* ids are never exposed in URLs and no client needs to mint an
id before the server sees it.

### Enums: split by open vs closed

| pg enum | `text` + zod validation |
|---|---|
| Closed lists — the set is defined and stable | Open lists — the set is still being figured out, or any taxonomy that will be missing a category |

`text` turns a list change from a migration into a code change. Both are still declared once
in `packages/contracts` and derived.

### Transactions

**Explicit `tx`** — `db.transaction(async (tx) => ...)`, passed down. Visible, greppable, no
magic. AsyncLocalStorage cleans up signatures and makes debugging much harder; multi-write
operations are usually few.

**Side effects that must always accompany a write go in a service-layer transaction, not a
database trigger.** A trigger is invisible in the codebase, hard to test, and can't record
*who* did it without extra session plumbing.

## MongoDB + Mongoose

Only when the data is genuinely document-shaped — nested structures read and written as a
whole, with no relational queries across them. A "we might need flexibility later" argument
is not that; Postgres has `jsonb`.

| Topic | Decision |
|---|---|
| ODM | **Mongoose**, via `@nestjs/mongoose` |
| Schema definition | Still derived from the zod schemas in `packages/contracts` — the contract stays the source of truth, the same as with Drizzle |
| Data access | Models injected into services directly. No repository layer |
| Ids | Mongo's `ObjectId`, exposed as its string form. Never leak the raw BSON type past the service |
| Timestamps | `{ timestamps: true }` — `createdAt`/`updatedAt` on every collection |
| Multi-document writes | An explicit **session**, passed down, same discipline as Drizzle's `tx` |
| Indexes | Declared on the schema, in code — not created by hand against the live database |

If installed, the **`mongodb`** and **`mongodb-schema-design`** skills cover modelling
(embed vs reference, unbounded arrays, aggregation pipelines) — use them for schema work.

## Auth — better-auth

better-auth isn't a Nest library. It's a framework-agnostic engine that wants two things
Nest normally owns:

1. **An HTTP route** — one handler serving all of `/api/auth/*`. It's a `(request) => response` function, mounted as middleware, not a Nest controller. Separately you need a guard that reads the session onto the request so `@CurrentUser()` works. `@thallesp/nestjs-better-auth` provides exactly that (community, actively maintained).
2. **Database tables** — `user`, `session`, `account`, `verification`, plus more per plugin, generated by better-auth's CLI.

**This is where Drizzle pays off:** better-auth's CLI emits a **Drizzle schema file**,
committed next to the domain schema, and `drizzle-kit generate` produces one migration
covering both. One schema source, one migrations folder, one `migrate` on deploy.

| Topic | Decision |
|---|---|
| Sign-in | **Email + password**, no self-signup |
| User creation | Seed script / admin-only endpoint |
| Password reset | Manual for a small internal team — avoids an email provider entirely |
| Session | DB-backed in an httpOnly cookie (better-auth's default) |
| Origin | **Same origin for web and API** — first-party cookie, no CORS, no `SameSite=None` |
| Guards | **Global guard, secure by default** + `@Public()` for open routes. The inverse fails silently the one time you forget |
| Plugins | **No** organization/RBAC plugins — they're built for multi-tenant SaaS |

**Open signup must be off in an internal tool.** Otherwise strangers read the data.

*Consider Google OAuth instead when* users type on a phone in awkward conditions and a
password is real friction. It's a config block in better-auth, easy to add later — it just
needs a Google Cloud project.

### Two rules about the coupling

1. **Never hand-edit the generated auth schema file** — re-run the CLI.
2. **Don't add domain columns to `user`** — use better-auth's `additionalFields` for a field or two, or a separate `user_profile` table if it grows.

### Multi-tenancy — decide on day one

The only decision here that's genuinely expensive to reverse. Adding `organization_id` later
touches every table and every query. If the product might serve more than one organization,
add it from the first migration.

By contrast, a **`role` column is a cheap omission** — one column plus a guard, added the day
the first "only X may delete" requirement appears. Don't build it speculatively.

**Attribution is separate from authorization.** `author_id` / `assigned_to` columns stay
regardless — "who did it" is not "who may".

## Error format

**With oRPC, use the shape it already sends** — don't hand-roll one and intercept every
error to rename two keys:

```json
{ "code": "NOT_FOUND", "status": 404, "message": "Project 8f3a… not found", "data": null }
```

| Field | Role |
|---|---|
| `code` | Enum. **The i18n key** — ``t(`errors.${code}`)``. A union in `packages/contracts`, so a new code without UI copy is a compile error |
| `message` | **Always English, for developers.** Never shown to a user |
| `status` | Duplicated in the body deliberately — it survives screenshots and log pastes |
| `data` | Where validation failures arrive, as `{ issues: [...] }` with a `path` per field, so react-hook-form knows which input to render under |

oRPC also sends `defined` (whether the procedure declared the error). Don't model it in the
contract — the client branches on `code`, and zod drops it on parse.

Without oRPC the same three roles apply under the names `{ code, message, statusCode }`,
with an optional `details?: Record<string, string>`.

**500s:** unhandled exceptions become `INTERNAL_SERVER_ERROR` / 500. While the users are the team,
send the real `message` — it's useful. Once there's an outside user: a generic message plus a
`requestId` to correlate against the log.

## API shape

| Topic | Decision |
|---|---|
| Pagination | **offset** — `{ items, total, page, pageSize }`. *Deviate to cursor when* the surface is mobile infinite scroll |
| Envelope | **Bare object** for a single resource. Only lists are wrapped (they carry `total`) |
| Casing | `camelCase` in JSON |
| Dates | ISO 8601 UTC strings. `date-fns` for formatting and arithmetic |
| Methods | `GET` / `POST` / `PATCH` / `DELETE`. **No `PUT`** |

**Why offset by default:** cursor is better in theory but can't say "1–50 of 312" and can't
jump to page 7 — and table libraries want `total`.

### Null vs absent — get this right early

- **In responses** — every field is always present. Empty is `null`, never omitted. The frontend never has to distinguish "not returned" from "empty in the DB."
- **In PATCH** — **absent = don't touch, explicit `null` = clear.** `{ dueDate: null }` erases it; `{}` changes nothing.

## API layer — oRPC

**`@orpc/nest`.** Contract-first: controllers are type-checked against the contract, typed
React Query hooks come out the other side, no codegen step. The contract lives in
`packages/contracts` alongside the enums.

It is a second mental model on top of Nest, and worth it — the alternative (route descriptors
+ a thin axios wrapper) doesn't verify that a controller's URL matches the contract's URL,
and that gap is exactly what drifts.

*Deviate when* an external consumer or a native app appears → Nest Swagger +
`@hey-api/openapi-ts` codegen. **Never ts-rest** — unmaintained.

Whichever is used: **the frontend never writes a URL.**

In practice it is two pieces. The contract, in `packages/contracts`:

```ts
export const projectsContract = {
  list: oc
    .route({ method: 'GET', path: '/projects' })
    .input(paginationQuerySchema)
    .output(paginated(projectListItemSchema)),
};
```

And the controller, which names no URL:

```ts
@Controller()
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Implement(contract.projects.list)
  list() {
    return implement(contract.projects.list).handler(({ input }) => this.projects.list(input));
  }
}
```

Returning a shape the contract doesn't describe is a compile error. That is the whole reason
to pay the second mental model.

**Import `Implement`, `implement`, `ORPCError` and `onError` from `@orpc/nest`** — it
re-exports the server pieces, and older docs import them from `@orpc/server`.

**`/health` stays out of the contract** and out of the `/api` prefix
(`setGlobalPrefix('api', { exclude: ['health'] })`). The platform polls it, not the API's
consumer, so it should be the dumbest thing in the process.
