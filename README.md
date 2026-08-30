# My Film Index

A hosted, database-backed log of everything I've watched — films, series, animation and documentaries — with an owner-only add flow and an actor network diagram showing who has worked with whom.

The public site is read-only. Adding a title is gated behind a secret unlock token that only I hold.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16.3.3 (App Router, Turbopack) |
| UI | React 19.2.8, with the React Compiler enabled (`reactCompiler: true`) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 — CSS-first config via `@theme` in `src/app/globals.css` |
| Structured data | Supabase Postgres 17, queried with [`postgres`](https://github.com/porsager/postgres) (tagged templates, no ORM) |
| Image storage | Cloudflare R2, via `@aws-sdk/client-s3` |
| Image processing | `sharp` |
| Metadata source | TMDB API v4 |
| Tests | Vitest (68 tests) |

### Main frontend libraries

- **`swr`** — data fetching for the TMDB title search in the add-title modal. Handles request deduplication and caching behind a 180 ms debounce.
- **`@tanstack/react-virtual`** — window virtualization for the film grid. The grid virtualizes computed *rows* rather than individual cards, since CSS grid can't be virtualized directly.
- **`d3-force`** — computes the actor network layout. Runs **server-side only**; see [Actor network](#actor-network).
- **`d3-zoom`** + **`d3-selection`** — pan/zoom gesture handling on the network canvas. d3 owns the gesture and is the single source of truth for the transform; React owns all rendering.

There is no component library and no CSS framework beyond Tailwind. Every component is hand-built from a design prototype, and `--color-*: initial` in the theme block clears Tailwind's default palette so components can only reach for the named design tokens.

---

## Features

- **Film index** (`/`) — responsive grid of every logged title, filterable by category (Movies / TV shows / Animation / Documentaries), sortable by year or title.
- **Franchise view** — toggling "Franchises" groups titles into franchise sections with film counts and year spans. It composes with the category filters rather than replacing them.
- **Film detail** (`/films/[slug]`) — hero frame, director, year, categories and franchise, plus the full cast list with roles.
- **Actor network** (`/actors`) — force-directed graph of every actor in the index, linked when they share a film. Hovering an actor highlights their collaborators and dims everyone else; searching narrows to a single actor. Scroll to zoom, drag to pan.
- **Owner-only add flow** — a floating "+" opens a modal that searches TMDB, pre-fills title/year/director/categories/cast from the chosen result, accepts a frame image by drag-or-browse, and lets you assign an existing or new franchise.

---

## System design

### Rendering model

All three pages are **dynamic** (`ƒ` in the build output), server-rendered per request:

- `/` reads the owner cookie, which opts the route into dynamic rendering, then queries films and franchises.
- `/films/[slug]` resolves the slug per request.
- `/actors` is explicitly `force-dynamic` so the graph reflects the current database rather than being frozen at build time.

Writes go through a single **Server Action**, `saveFilm`. Server Actions are public POST endpoints, so it re-checks authorization itself rather than trusting that the UI only renders the "+" for the owner.

### The two storage systems

The project deliberately splits persistence across two stores, because the two kinds of data have nothing in common:

**1. Supabase Postgres — structured data**

Everything relational: films, franchises, people, cast credits, categories. This is where the interesting queries live, and the reason for a real relational database rather than a document store is the actor network — it's a self-join over `film_cast`, which is trivial in SQL and painful anywhere else.

Connected over Supabase's **transaction pooler (port 6543)**. This matters: the pooler assigns each transaction whichever backend connection is free, so prepared statements don't survive between queries. `src/lib/db/client.ts` therefore sets `prepare: false` — without it, writes fail intermittently with Postgres error `26000`.

**2. Cloudflare R2 — image bytes**

Only the frame images. Postgres stores a single `poster_key` string per film (e.g. `frames/<uuid>`); the actual bytes never touch the database. R2 was chosen for zero egress fees, S3-compatible tooling, and the ability to serve objects publicly straight from a CDN with a one-year immutable cache.

The two are kept consistent by ordering: `saveFilm` uploads every image variant **before** inserting the film row, so a failed upload aborts the save rather than leaving a row pointing at frames that were never written.

### Data model

```
franchises ──┐
             ├──< films >──── film_categories
             │       │
people >─────┴───────┴──────< film_cast
```

- `films` — slug, title, year, director, `poster_key`, optional `franchise_id`
- `film_categories` — many-to-many; `film_category` is a Postgres enum
- `people` — one row per real person
- `film_cast` — `PRIMARY KEY (film_id, person_id)` with a role and sort order

**Person identity is keyed on `tmdb_person_id`, not name.** Names are not unique — there are several working actors called Chris Evans — and collapsing them into one row would invent collaborations between strangers in the network diagram. Rows sourced from TMDB are unique on `tmdb_person_id`; rows with no TMDB id (seed data, hand-entered credits) fall back to a *partial* unique index on `name where tmdb_person_id is null`. When a TMDB-sourced credit first matches a name-only row, it claims that row rather than inserting beside it, so an actor never splits into two nodes.

### Actor network

The co-appearance relationship is **not stored** — it's derived. Two actors are linked when they appear in the same film, so every film contributes a clique over its own cast.

- `src/lib/network/actorGraph.ts` — pure, dependency-free graph construction (nodes, deduplicated edges with a shared-film count, degree). Unit-tested on fixtures.
- `src/lib/db/graph.ts` — the query that feeds it.
- `src/lib/network/layout.ts` — the d3-force simulation.

The layout runs **on the server**, and this is deliberate. d3's simulation is reproducible within one JavaScript engine but not across two, so computing it during both SSR and hydration produced coordinates differing in the last few significant digits — a React hydration mismatch. Resolving positions once on the server fixes that, and has the side benefit that `d3-force` never ships to the browser.

### Owner unlock token

There are no user accounts. Access is a single shared secret, `OWNER_UNLOCK_TOKEN`, set as an environment variable.

1. Visit `/api/unlock?token=<token>` once per browser.
2. The route compares it against the environment variable in **constant time**.
3. On a match it sets an `owner` cookie whose value is `HMAC-SHA256(key = token, "owner-cookie")`, hex-encoded — `httpOnly`, `secure`, `sameSite=lax`, one year.
4. Every request derives the expected cookie value from the token and compares it in constant time.

The token itself is never stored in the cookie, so a stolen cookie doesn't reveal it. The check **fails closed** if the variable is unset — HMAC accepts an empty key happily, so without that guard an unconfigured deployment would accept a publicly-computable constant as a valid owner cookie.

**Revocation** is changing `OWNER_UNLOCK_TOKEN` and restarting: every existing cookie stops validating immediately. The variable is read at request time, so this needs no rebuild.

The cookie gates *rendering* of the "+" button, but the real boundary is in `saveFilm` itself, which re-checks it on every call.

---

## Images

Frames are 2.40:1 scope stills — the reference source size is **1280 × 533**.

On upload, `sharp` produces four WebP variants, respecting EXIF orientation and never upscaling past the source:

| Variant | Dimensions (from a 1280 × 533 source) | WebP quality | Typical size |
| --- | --- | --- | --- |
| 480w | 480 × 200 | 82 | ~22 KB |
| 720w | 720 × 300 | 81 | ~38 KB |
| 960w | 960 × 400 | 80 | ~52 KB |
| 1280w | 1280 × 533 | 78 | ~70 KB |

About **180 KB stored per film** across all four. Quality steps down as width rises because compression artefacts are less visible at higher resolutions.

- **Object keys:** `frames/<film-uuid>-<width>.webp`
- **Cache-Control:** `public, max-age=31536000, immutable` — safe because keys are content-addressed by film id and never overwritten
- **Ladder rationale:** 720 exists for 1× desktop, which needs ~576 px and would otherwise round up to 960. 1280 is the ceiling because that's the source width.

Two display details worth knowing:

- Frames are shown in **16:9** containers with `object-cover`, so a 2.40:1 image is scaled to fill by height and roughly **26% of its width is cropped**. This is intentional, carried over from the design.
- Because of that overscale, the rendered image is ~1.35× wider than its own box, which `srcset` selection cannot know. The `sizes` attribute is therefore deliberately wider than the tile's measured width.

Because the frame's bytes travel as a Server Action argument, `next.config.ts` raises `serverActions.bodySizeLimit` to 8 MB — actions are capped at 1 MB by default, and a PNG at 1280 × 533 clears that easily. The limit only bounds what the browser may post; `sharp` re-encodes to WebP server-side regardless.

`NEXT_PUBLIC_IMAGE_DOMAIN` is inlined at **build** time, and `src/app/layout.tsx` emits a `<link rel="preconnect">` to that origin so the first frame doesn't pay for DNS + TCP + TLS.

---

## File structure

```
src/
├── app/                          # App Router — routes and layout
│   ├── page.tsx                  # / — film index (Server Component; reads owner cookie)
│   ├── layout.tsx                # root layout, preconnect hint
│   ├── globals.css               # Tailwind v4 @theme — all design tokens
│   ├── films/[slug]/page.tsx     # /films/[slug] — film detail
│   ├── actors/page.tsx           # /actors — force-dynamic; lays out the graph server-side
│   └── api/
│       ├── unlock/route.ts       # token → owner cookie
│       └── tmdb/search/route.ts  # proxies TMDB so the API key stays server-side
│
├── actions/
│   └── saveFilm.ts               # the only write path; re-checks authorization
│
├── components/
│   ├── film-index/               # index page: grid, cards, chips, sort, franchise sections
│   ├── film-detail/              # hero image, cast list
│   ├── add-title/                # owner-only modal: search, categories, franchise, upload
│   ├── actor-network/            # canvas, hover panel, search field, zoom controls
│   └── shared/                   # Chip
│
├── hooks/
│   └── useTitleSearch.ts         # debounced TMDB search via SWR
│
└── lib/
    ├── auth/                     # ownerToken (HMAC + constant-time), ownerSession
    ├── db/                       # client (prepare:false), films, franchises, graph
    ├── films/saveFilmInput.ts    # pure validator for untrusted Server Action input
    ├── images/                   # frameWidths, resize (sharp), r2 (upload + URL building)
    ├── network/                  # actorGraph (pure), layout (d3-force, server-side)
    ├── tmdb/client.ts            # TMDB search + normalization
    ├── slug.ts                   # unique slug generation
    └── types.ts                  # shared domain types

supabase/migrations/              # 0001_init.sql, 0002_people_tmdb_id.sql
scripts/seed.ts                   # seeds the database with starter titles
tests/                            # Vitest suites, mirroring src/lib
```

A few structural rules the codebase follows deliberately:

- **Pure logic is separated from its I/O.** `saveFilmInput.ts` sits outside the `"use server"` module (every export of one must be an async function); `actorGraph.ts` sits outside `db/graph.ts` (which throws at import time without `DATABASE_URL`); `frameWidths.ts` sits outside `resize.ts` (which imports `sharp`, and would drag the native image pipeline into the browser bundle). In each case the split is what makes the logic unit-testable.
- **Server/client boundaries are drawn to keep heavy dependencies server-side.** `d3-force`, `sharp`, `postgres` and the AWS SDK are all absent from the client bundle.

---

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill it in — see below
npm run seed                       # optional: populate with starter titles
npm run dev
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | development server |
| `npm run build` / `npm start` | production build and serve |
| `npm test` | Vitest suite |
| `npm run lint` | ESLint |
| `npm run seed` | seed the database |

### Environment variables

| Variable | Reaches the browser? | Notes |
| --- | --- | --- |
| `DATABASE_URL` | No | Supabase transaction pooler URL (port 6543). Required **at build time** too. |
| `OWNER_UNLOCK_TOKEN` | No | Generate with `openssl rand -hex 32`. Use a different value per environment. |
| `TMDB_API_KEY` | No | The v4 **API Read Access Token**, not the shorter v3 key. |
| `R2_ACCOUNT_ID` | No | From the R2 overview page. |
| `R2_ACCESS_KEY_ID` | No | R2 API token, scoped to Object Read & Write on the one bucket. |
| `R2_SECRET_ACCESS_KEY` | No | Shown once on token creation. |
| `R2_BUCKET_NAME` | No | |
| `NEXT_PUBLIC_IMAGE_DOMAIN` | **Yes, by design** | Public bucket hostname — no scheme, no trailing slash. Inlined at build; changing it needs a rebuild. |

`.env.local` is gitignored and is for local development only. In production these belong in the host's encrypted environment-variable store.

### Deployment notes

- Requires a **Node runtime**, not edge — `sharp`, `postgres` and `crypto` all need it.
- Set a stable `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` when running more than one instance.
- Prefer a custom domain on the R2 bucket over the `r2.dev` development URL, which is rate-limited and not intended for production.
