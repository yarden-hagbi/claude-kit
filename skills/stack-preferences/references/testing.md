# Testing

Not required on day one. It has a defined shape for when it enters, so the decision is
*when*, never *what*.

| Tool | Use |
|---|---|
| **Vitest** | Unit and integration, on both api and web. **Never Jest** |
| **Playwright** | e2e, for critical paths only |

**Not used:** Testcontainers, React Testing Library.

## What gets tested

**Test logic that is expensive to get wrong** — calculations with legal or financial
consequences, permission checks, anything where "it looked right when I clicked it" isn't
verification. Don't chase coverage; a test that only restates the implementation is a
liability.

**Components are not unit-tested.** React Testing Library is deliberately absent — component
behaviour is covered by Playwright on the paths that matter, and everything else is covered
by types.

## DB-touching tests

Run against **the Postgres in `docker-compose.yml`** — the same container as dev, with a
separate database or schema for tests, migrated and truncated per run. No new dependency, no
container-per-run startup cost.

The tradeoff to accept: CI needs a Postgres service container, and a developer must have the
compose stack up. That's cheaper than Testcontainers here.

**Never mock the database** to test a query. A mocked query proves the mock works.

## The first test to write

The first time a calculation is more than a lookup — a majority, a proration, a statutory
deadline — that's where testing starts. Before that, types and a seed script cover more
ground per minute spent.
