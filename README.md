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
| Tests | Vitest (82 tests) |

### Main frontend libraries

- **`swr`** — data fetching for the two lookups in the add-title modal: the TMDB title search, and the people already in the index that the cast comboboxes offer. Both sit behind the same 180 ms debounce (`useDebouncedValue`) and get request deduplication and caching from SWR.
- **`@tanstack/react-virtual`** — window virtualization for the film grid. The grid virtualizes computed *rows* rather than individual cards, since CSS grid can't be virtualized directly.
- **`d3-force`** — computes the actor network layout. Runs **server-side only**; see [Actor network](#actor-network).
- **`d3-zoom`** + **`d3-selection`** — pan/zoom gesture handling on the network canvas. d3 owns the gesture and is the single source of truth for the transform; React owns all rendering. Dragging a *node* is React's, so the zoom behaviour declines any gesture that starts on one (`zoom.filter`) — d3 binds `mousedown` on the SVG before React sees it, so stopping propagation would be too late.
- **`lucide-react`** — the handful of icons in the frame editors and the franchise/studio pickers.

There is no component library and no CSS framework beyond Tailwind — lucide supplies icons, not components. Every component is hand-built from a design prototype, and `--color-*: initial` in the theme block clears Tailwind's default palette so components can only reach for the named design tokens.

---

## Features

- **Film index** (`/`) — responsive grid of every logged title, one column below `sm`, two up to `lg`, three above. Filterable by category (Movies / TV shows / Animation / Documentaries), sortable by year or title.
- **Grouped views** — "Franchises" and "Studios" sit beside the categories as chips. Each groups titles into sections with film counts and year spans, and they compose with the category filters and with each other rather than replacing them.
- **Film detail** (`/films/[slug]`) — hero frame, director(s), year, categories, franchise and studio, plus the full cast list with roles. For the owner the frame is editable in place: hover for the scrim and its delete button, click to re-crop.
- **Actor network** (`/actors`) — force-directed graph of every actor in the index, linked when they share a film. Hovering an actor highlights their collaborators and dims everyone else; a search tints every possible match, and the last one standing a stronger blue. Scroll to zoom, drag the background to pan, drag a node to move it, and "Reset view" eases nodes and camera back together.
- **Owner-only add flow** — a floating "+" opens a modal that searches TMDB and pre-fills title / year / director(s) / categories / cast, or takes the details by hand. Each cast row is a combobox over the people already in the index, so a hand-entered credit adopts an existing person rather than splitting them in two. A frame is dropped or browsed for and then framed in place — drag to reposition, scroll or pull a corner to zoom. Franchise and studio are free-text comboboxes that create the grouping if it does not exist yet. All three lookup lists answer to ↑ / ↓ / Enter / Escape.

Film and series metadata comes from TMDB, and the footer carries the attribution their terms require.

---

## System design

### Rendering model

All three pages are **dynamic** (`ƒ` in the build output), server-rendered per request:

- `/` reads the owner cookie, which opts the route into dynamic rendering, then queries the films once and slices both grouped views out of that same list.
- `/films/[slug]` resolves the slug per request, and reads the owner cookie too — the frame editor is the owner's alone, and a visitor is served the still with no editing markup at all.
- `/actors` is explicitly `force-dynamic` so the graph reflects the current database rather than being frozen at build time.

Writes go through two **Server Actions** — `saveFilm` for a new title, `updateFilmFrame` for replacing or clearing an existing film's still. Server Actions are public POST endpoints, so both re-check authorization themselves rather than trusting that the UI only renders the "+" for the owner. The two owner-only Route Handlers (`/api/people/search`, `/api/frames/source`) check the same cookie.

### The two storage systems

The project deliberately splits persistence across two stores, because the two kinds of data have nothing in common:

**1. Supabase Postgres — structured data**

Everything relational: films, franchises, studios, people, cast credits, categories. This is where the interesting queries live, and the reason for a real relational database rather than a document store is the actor network — it's a self-join over `film_cast`, which is trivial in SQL and painful anywhere else.

Connected over Supabase's **transaction pooler (port 6543)**. This matters: the pooler assigns each transaction whichever backend connection is free, so prepared statements don't survive between queries. `src/lib/db/client.ts` therefore sets `prepare: false` — without it, writes fail intermittently with Postgres error `26000`.

**2. Cloudflare R2 — image bytes**

Only the frame images. Postgres stores a single `poster_key` string per film (`frames/<uuid>`, or `frames/<uuid>-<8 hex>` once the frame has been re-cropped); the actual bytes never touch the database. R2 was chosen for zero egress fees, S3-compatible tooling, and the ability to serve objects publicly straight from a CDN with a one-year immutable cache.

The two are kept consistent by ordering. `saveFilm` uploads every image variant **before** inserting the film row, so a failed upload aborts the save rather than leaving a row pointing at frames that were never written. `updateFilmFrame` runs the same reasoning in reverse at the end: it points the row at the new key first and deletes the old objects only afterwards, because orphaned bytes are a cheaper failure than a film whose frame has vanished.

### Data model

```
franchises ──┐
             ├──< films >───< film_categories
studios ─────┘      │
                    └──< film_cast >──── people
```

- `films` — slug, title, year, director, `poster_key`, optional `franchise_id`, optional `studio_id`
- `franchises`, `studios` — one row per name, unique. Deliberately two tables of the same shape rather than one grouping table with a kind column: a film has at most one of each, and separate columns make the schema say so
- `film_categories` — many-to-many; `film_category` is a Postgres enum
- `people` — one row per real person
- `film_cast` — `PRIMARY KEY (film_id, person_id)` with a role and sort order

**A grouping is named, not chosen.** Both pickers are comboboxes, so a save may name a franchise or studio that does not exist yet; `insertFilm` resolves the name inside its transaction, creating the row if needed, and matches case-insensitively so "a24" does not land beside "A24".

**`director` is one text column.** A co-directed film stores its directors comma-separated (`"Anthony Russo, Joe Russo"`) and every screen renders them joined by a middle dot. `src/lib/films/directors.ts` owns both forms.

**Person identity is keyed on `tmdb_person_id`, not name.** Names are not unique — there are several working actors called Chris Evans — and collapsing them into one row would invent collaborations between strangers in the network diagram. Rows sourced from TMDB are unique on `tmdb_person_id`; rows with no TMDB id (seed data, hand-entered credits) fall back to a *partial* unique index on `name where tmdb_person_id is null`. When a TMDB-sourced credit first matches a name-only row, it claims that row rather than inserting beside it, so an actor never splits into two nodes.

The cast comboboxes exist to keep that path clean: picking a suggestion adopts the person's identity, where typing the same name afresh would file a second row beside them. One edge is still sharp — if a name-only row *and* a TMDB row for the same person both exist, the claiming update collides with `people_tmdb_person_id_key` and the save fails with `23505` rather than resolving to the TMDB row.

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

The cookie gates *rendering* of the "+" button and the frame editor, but the real boundary is in the two Server Actions and the two owner-only Route Handlers, each of which re-checks it on every call.

---

## Images

A frame is framed before it is stored. The crop field renders the framed region to a canvas and exports WebP at up to **1280 px wide**, and its window is 16:9 — so a cropped frame is 16:9, the same shape as every container that displays it. A file that is uploaded and never reframed is stored exactly as it arrived, at whatever aspect ratio it happens to have.

On upload, `sharp` produces four WebP variants, respecting EXIF orientation and never upscaling past the source:

| Variant | WebP quality | Measured across the frames stored today |
| --- | --- | --- |
| 480w | 82 | 8–16 KB |
| 720w | 81 | 12–31 KB |
| 960w | 80 | 16–40 KB |
| 1280w | 78 | 21–55 KB |

Between roughly **55 KB and 140 KB per film** across all four, depending on how much detail the still carries. Quality steps down as width rises because compression artefacts are less visible at higher resolutions — which is easiest to see on a source narrower than the ladder, where `withoutEnlargement` pins 720w, 960w and 1280w to the same pixels and the files still shrink (31 → 28 → 26 KB) as quality falls.

- **Object keys:** `frames/<film-uuid>-<width>.webp` for a film's first frame; re-cropping from the detail page writes `frames/<film-uuid>-<8 hex>-<width>.webp`
- **Cache-Control:** `public, max-age=31536000, immutable`
- **Why the suffix:** a year of immutability is exactly what stops a re-crop overwriting its old key — every browser and CDN that had already seen it would go on serving the old still. So each save writes a fresh key, re-points the row, and deletes the objects the row used to name.
- **Ladder rationale:** 720 exists for 1× desktop, which needs ~576 px and would otherwise round up to 960. 1280 is the ceiling because that is the widest the crop exports.

One display detail worth knowing: the `sizes` attributes on the grid and detail images are written for the 2.40:1 stills the index started with, which `object-cover` scaled to about 1.35× the width of their box. Now that stored frames are 16:9 inside 16:9 containers there is no overscale, so those values simply err a rung high — conservative rather than wrong.

Because the frame's bytes travel as a Server Action argument, `next.config.ts` raises `serverActions.bodySizeLimit` to 8 MB — actions are capped at 1 MB by default, and a large PNG clears that easily. The limit only bounds what the browser may post; `sharp` re-encodes to WebP server-side regardless.

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
│       ├── tmdb/search/route.ts  # proxies TMDB so the API key stays server-side
│       ├── people/search/route.ts   # owner-only: names already in the index, for the cast comboboxes
│       └── frames/source/route.ts   # owner-only: a stored frame's bytes, same-origin so the crop canvas stays clean
│
├── actions/
│   ├── saveFilm.ts               # adds a title; re-checks authorization
│   └── updateFilmFrame.ts        # replaces or clears an existing film's still
│
├── components/
│   ├── film-index/               # grid, cards, chips, sort, grouped sections
│   ├── film-detail/              # hero, cast list, the owner's in-place frame editor
│   ├── add-title/                # owner-only modal: search, manual details, cast comboboxes, group pickers
│   ├── actor-network/            # canvas, hover panel, search field, zoom controls
│   └── shared/                   # Chip, ImageCropField (drop / crop / reframe — used by both editors)
│
├── hooks/
│   ├── useTitleSearch.ts         # debounced TMDB search via SWR
│   ├── usePeopleSearch.ts        # debounced people lookup, same shape
│   ├── useDebouncedValue.ts      # the debounce both are built on
│   └── useListboxNavigation.ts   # ↑/↓/Enter/Escape for all three lookup lists
│
└── lib/
    ├── auth/                     # ownerToken (HMAC + constant-time), ownerSession
    ├── db/                       # client (prepare:false), films, groups, people, graph
    ├── films/
    │   ├── saveFilmInput.ts      # pure validator for untrusted Server Action input
    │   └── directors.ts          # the stored comma-separated form ↔ the middle-dot one
    ├── images/                   # frameWidths, resize (sharp), r2 (upload, delete, URL building)
    ├── network/                  # actorGraph (pure), layout (d3-force, server-side)
    ├── tmdb/client.ts            # TMDB search + normalization
    ├── slug.ts                   # unique slug generation
    └── types.ts                  # shared domain types

supabase/migrations/              # 0001_init.sql, 0002_people_tmdb_id.sql, 0003_studios.sql
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
