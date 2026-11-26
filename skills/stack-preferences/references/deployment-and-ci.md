# Deployment — Railway

Railway is the default host for every personal project. No Vercel, no Fly, no Render — one platform, learned once.

## Topology

```
internet → [ web · Caddy ]  ──/api/*──→ [ api · Nest ] ──→ [ Postgres ]
             public domain              private network     private network
             static SPA                 only                only
```

Three services: `postgres`, `api`, `web`.

**Why Caddy in front rather than letting Nest serve the static files:** the API gets **no public domain at all**. Only Caddy is exposed; the api service is reachable *only* over Railway's private network. That's a real security property, and it costs nothing. It also keeps the two deployable independently.

The Caddyfile is about six lines:

```
:{$PORT} {
  encode zstd gzip
  handle /api/* { reverse_proxy api.railway.internal:3000 }
  handle { try_files {path} /index.html
           file_server }
}
```

## The traps

| # | Trap |
|---|---|
| 1 | **Listen on `::`, not `0.0.0.0`.** Railway's private network is IPv6-only. An app on `0.0.0.0` simply won't be reachable, with no useful error. This is the most common private-networking failure |
| 2 | **Migrations as a pre-deploy command, never at bootstrap.** At bootstrap they race across replicas, and a failure leaves a half-started app instead of a failed deploy |
| 3 | **Reference variables** — `DATABASE_URL=${{Postgres.DATABASE_URL}}`, so a credential rotation doesn't silently break the API |
| 4 | **Every push builds every service** — see below |
| 5 | **Turn on backups the first time real data is entered by hand** — not "at launch". That's the moment the data stops being reproducible. It's a dashboard toggle, seconds |
| 6 | **One environment (production)** until an external stakeholder needs to see the system. Preview Environments are there when wanted |

**Every push builds and deploys all services.** Deliberate: `contracts` changes span both services, so watch-paths would create exactly the skew you're preventing — web deployed against a schema the api hasn't shipped. "Production is commit `abc123`, everywhere" is worth more than build minutes. The cost is that a frontend change restarts the API — which is why the **`/health` healthcheck** matters: Railway waits for the new deployment to pass it before switching traffic, so the restart isn't visible.

## Infrastructure as Code

Two Railway things are called config-in-a-file, and the one in most tutorials is on its way out:

| | File | Scope | Status |
|---|---|---|---|
| Config as Code | `railway.json` / `railway.toml` | one service's deploy settings | **Deprecated — stops being read 2026-12-01**, new services can't opt in |
| **Infrastructure as Code** | **`.railway/railway.ts`** | the whole project/environment | **GA** |

**Always `.railway/railway.ts`.** TypeScript, in the monorepo, describing the entire project — services, the database, domains, env vars, replicas, healthchecks — in one file:

```ts
import { defineRailway, project, service } from "railway/iac";

export default defineRailway(() => {
  const api = service("api", { start: "node dist/main.js", healthcheck: "/health" });
  const web = service("web");
  return project("<name>", { resources: [postgres, api, web] });
});
```

Flow: `railway config init` (or `pull` to import an existing project) → `railway config plan` → `railway config apply`. Plan is read-only and shows an add/change/**destroy** diff before anything happens.

**Four things to know:**

1. **Secrets stay out of git.** `railway config pull` renders existing values as `preserve()` — the value stays on Railway and the file just says "keep it". Sealed variables always stay `preserve()`. Only `--include-variables` inlines them, and it warns. **The file is safe to commit.**
2. **Omit means delete.** One file owns the whole environment — removing a service from it **destroys** that service on apply. Destructive changes are flagged, and non-interactively they need `--confirm-destructive` on top of `--yes`. Read those lines.
3. **Use the official GitHub Action** — `railwayapp/config@v1`: plan on every PR touching `.railway/**` with a diff comment, apply on merge. Merging is the approval.
4. **IaC manages infrastructure, not deploys.** Triggering a deploy stays separate.

Optional later: `railway config plan --detailed-exit-code` exits `2` on drift, so a dashboard click behind your back shows up as a failed build instead of a surprise.

## CI/CD

```
.github/workflows/ci.yml              PR + main: turbo typecheck lint build (+ test)
.github/workflows/railway-config.yml  PR: config plan (diff) · merge: config apply
```

| Topic | Decision |
|---|---|
| Railway auto-deploy | **Off.** Otherwise there are two deploys per merge and the ungated one wins the race |
| On PR | pnpm install (cached) → `turbo typecheck lint build --affected` |
| On push to main | The same checks, then deploy via the Railway CLI with a `RAILWAY_TOKEN` secret |
| Order | **api first (wait for the healthcheck), then web** — on a breaking contract change the backend is always already up |
