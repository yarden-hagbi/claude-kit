# Frontend — React, Vite, TanStack

**React + Vite** for every web app. *Deviate to Next.js when* SEO or marketing pages are needed.

## Routing and origin

**react-router in library mode** (`createBrowserRouter`), client-side only. **No SSR** — it requires a Node server for the web app and buys nothing for an app that's entirely behind auth.

*Deviate to Next.js when* there's real SEO or a public marketing surface.

Two consequences to handle up front:

- **The static host needs an SPA fallback** (`try_files {path} /index.html`), or a refresh on a deep route returns 404.
- **The API URL disappears.** In production the reverse proxy serves the app and proxies `/api`, so the client calls `/api/...`. Locally a **Vite dev proxy** (`/api` → `localhost:3000`) reproduces that exactly. Result: no `VITE_API_URL`, no CORS, no environment-dependent client code, and a first-party cookie in both environments.

## Data layer

TanStack Query + the typed client from `packages/contracts`.

| Topic | Decision |
|---|---|
| Query keys | Mirror the resource tree — `['projects', id]`, `['projects', id, 'tasks']` |
| Errors | A global `onError` parses `code` and shows ``t(`errors.${code}`)`` in a toast |
| Global state | **No Redux.** Server state in Query, UI state in `useState`. Reach for Zustand only for genuinely shared cross-tree client state |
| Query params | **nuqs** — filters, search, and sort **in the URL** |
| Dates | **date-fns** |
| Request query strings | **query-string**, behind one `withQuery(path, params)` helper |

**Why the URL:** a filtered list becomes a link you can paste into a chat. That's how people actually share what they're looking at.

**Why `query-string` for outgoing requests:** hand-rolled `URLSearchParams` makes every
call site re-decide the same three things — coerce numbers with `String()`, skip absent
values, and loop to append array items. That drifts, and a forgotten `if (x)` sends
`?search=` where the schema expects the key to be absent. `query-string` does all three
in one call, and its **default array format is repeated keys**
(`status=open&status=done`), which is exactly what a
`z.union([schema, z.array(schema)])` query param parses. `qs` was the alternative and
loses: it is heavier and CJS-first, and its default bracket-index format would have to
be configured back to `repeat` before the server could read it.

Wrap it in a single `withQuery(path, params)` in `lib/api.ts` with `skipNull` and
`skipEmptyString` — so "absent means omit" is decided once, matching the PATCH rule,
rather than per call site.

*Deviate when* a request needs genuinely nested or deeply structured params → `qs`,
whose bracket syntax is what that is for. Flat key/value with arrays never needs it.

The nice coupling: `parseAsStringLiteral` takes the enum straight from contracts, so filter state, the query param, and the Postgres enum are the same union. A bogus `?status=purple` in a pasted link is caught by the parser instead of reaching the API.

## Forms

react-hook-form + `zodResolver`. **The schema that validates the form is the schema the API validates against** — imported from contracts, not re-declared.

**Explicit save button by default** — predictable, one clear failure point, no "did that save?" on bad connectivity.

*Autosave-on-blur is trivial to add later* because of the PATCH semantics: each field sends `{ dueDate: '2026-03-01' }` and nothing more. Switch when field/mobile use turns out to dominate.

## Tables

**TanStack Table + the shadcn data-table pattern.** Fully MIT, composes with the shadcn components already in the project, enough for list/filter/sort/paginate.

*Deviate to AG Grid when* grouping, pivoting, or Excel export is a genuine requirement — and go in knowing those are Enterprise, paid per developer. The failure mode is depending on a feature and discovering the license debt afterwards.

## Styling

**Tailwind** with CSS-first config in `@theme` + **shadcn/ui**.

Set the font as the theme default so `font-sans` everywhere is automatic:

```css
@theme {
  --font-sans: "<Font> Variable", system-ui, sans-serif;
}
```

**Self-host fonts** via `@fontsource-variable/*` rather than Google's CDN: no third-party request per load, works offline in dev, and one variable file covers every weight.

**Initialize shadcn fresh rather than following older tutorials** — the current version targets CSS-first Tailwind and the unified `radix-ui` package.

## Folder structure

```
src/features/<feature>/{components,hooks,api}   ← mirrors the backend modules
src/components/ui                               ← shadcn, untouched
src/lib                                         ← client, i18n, utils
src/routes                                      ← route definitions
```

Feature folders mirror backend modules deliberately — the same word means the same thing on both sides.

## Mobile

If any part of the app will be used on a phone, **build that surface mobile-first from the start**. Cheap now, expensive to retrofit.

**PWA/offline is not something you bolt on** — it rewrites the data layer (Query persistence + a write queue). If offline is a real requirement, decide it before building the data layer, not after.

## i18n and RTL

### i18next — always, even at one language

Every project uses i18next. **No hardcoded UI strings.**

```
src/locales/<lang>/
  common.json · errors.json · <feature>.json
```

**What justifies i18next at a single language: typed keys.** Declaration merging against the resource files gives autocomplete for every key and **a compile error on a typo or a missing key**. Without that, i18next at one language buys only indirection; with it you get compile-time coverage of all UI copy — including the guarantee that every new `ErrorCode` has copy.

That's the whole reason `code` is the error i18n key: adding a code to the union and forgetting the text is a build failure, not a `errors.SOMETHING_NEW` string on screen.

#### Single-language config

When the app ships in one language only:

- one locale, no language detector
- JSON bundled, no HTTP backend
- no fallback language
- **no language switcher**

Adding a second language later is then a real project, but the strings are already extracted — which is the expensive half.

### The Hebrew/RTL bundle

**Apply this whole section when the app is in Hebrew.** Skip it entirely for an English app.

Every item here is the expensive-to-fix kind — retrofitting RTL onto an existing UI is a nightmare. **Set all of it in the first commit, before there is any UI.**

| Topic | Decision |
|---|---|
| Root | `<html lang="he" dir="rtl">` |
| Radix | `<DirectionProvider dir="rtl">` — menus, sliders, and popovers flip correctly |
| Tailwind | **Logical properties only** — `ms-*`/`me-*`, `ps-*`/`pe-*`, `start-*`/`end-*`, `text-start`/`text-end` |
| Forbidden | `ml-*`, `mr-*`, `left-*`, `right-*`, `text-left`, `text-right` |
| Enforcement | A lint rule banning the physical ones — **from day one** |
| Bidi | `<Ltr>` / `<Rtl>` components |
| Font | **Heebo**, self-hosted via `@fontsource-variable/heebo`, as the `@theme` default |

#### The rule

Write it yourself rather than assuming a ready-made RTL plugin exists — it's ten lines either way. **This is the rule that protects the entire RTL decision**: without enforcement, physical properties creep back in within a week.

On Biome it's a GritQL plugin. Verified: it flags `className="ml-4 text-left"` and leaves `className="me-2 text-start"` alone.

```grit
language js

jsx_attribute(name=$n, value=$v) where {
  $n <: "className",
  $v <: r".*\b(?:ml-|mr-|pl-|pr-|left-|right-|text-left|text-right)\S*.*",
  register_diagnostic(
    span = $v,
    message = "RTL: physical direction utility. Use the logical one (ms-/me-, ps-/pe-, start-/end-, text-start/text-end).",
    severity = "error"
  )
}
```

Register it under `plugins` in `biome.json`. Two gotchas while writing GritQL: capture groups in a regex are read as metavariables, so use `(?:...)`, and a `"` inside a regex literal breaks compilation — use `\S` instead of a character class containing a quote.

On ESLint the equivalent is a small `no-restricted-syntax` rule.

#### `<Ltr>` / `<Rtl>`

`<bdi dir="ltr">` and `<bdi dir="rtl">` respectively, as components.

- The `bdi` provides **isolation** — surrounding Hebrew stops reordering the content.
- The explicit `dir` **forces** direction instead of letting the browser guess from the first strong character. That's what fixes `+972` phone numbers and mixed strings like `רח' הרצל 12א`.

Use `<Ltr>` for: phone numbers, emails, coordinates, ids, English names, URLs, code, any identifier with digits.
Use `<Rtl>` for: a Hebrew name or address embedded inside an otherwise-LTR run.

#### Why Heebo

Designed for Hebrew, and its Latin glyphs are Roboto-based — so English text inside Hebrew copy doesn't look bolted on. One variable file covers every weight.
