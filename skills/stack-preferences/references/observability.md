# Observability

The baseline ships from the first commit. Everything else has a trigger, so the decision is
*when*, never *what*.

## The day-one baseline

| Piece | Decision |
|---|---|
| Logging | **pino** + `nestjs-pino` as Nest's logger, with automatic request-id. `pino-pretty` locally, JSON in production (Railway parses JSON into fields). **Never winston** |
| Healthcheck | **`/health`** — the platform needs it before it will switch traffic |
| Env | **A zod env schema that throws at boot** — a missing var fails the deploy instead of surfacing as a 500 later |

That's not deferred monitoring — it's the baseline.

**Log redaction** is a pino config array, not code structure — a one-line change. Skip it
while logs stay on your own infrastructure; add it when connecting an external log provider
that would store personal data on servers that aren't yours.

## What's added later, in this order

| # | Tool | Trigger |
|---|---|---|
| 1 | **Sentry** — api and web | The first user who isn't you. Cheap, and catches what logs don't |
| 2 | **External uptime check** | When someone other than you would notice the app being down before you do. Railway's healthcheck only gates deploys — it won't page you |
| 3 | **OpenTelemetry traces** | When a slow request can't be explained from logs alone — typically once there are several services or heavy queries |

Adding Sentry before there's a second user is premature; adding it after the first bug report
from someone else is late.
