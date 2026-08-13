# Lobe

Lobe turns deliberate X bookmarks into organized, searchable context. You keep
using X's native bookmark button. Lobe captures the post at that moment, returns
control immediately, then classifies why you saved it in a durable background
job.

This repository contains the complete first product slice:

- A Chrome Manifest V3 extension built with WXT and React 19
- A Bun and Hono API with a durable background worker
- PostgreSQL, Drizzle, and pgvector persistence
- Intent classification and embeddings through Vercel AI SDK
- GPT-5.6 Luna for classification and selector repair
- `text-embedding-3-small` embeddings with indexed, sub-200 ms retrieval
- A responsive React 19 library with search, filters, corrections, and taste
  signals
- A shared shadcn component package, Hugeicons, Geist, and a pure-black theme

The current scope is intentionally explicit-save only, X only, and does not
include MCP or passive browsing analysis.

## How the X integration works

The extension does not redraw or replace X's bookmark icon. It listens for a
click on X's real semantic controls:

```text
article[data-testid="tweet"]
button[data-testid="bookmark"]
button[data-testid="removeBookmark"]
```

That keeps X responsible for the exact SVG, spacing, hover state, animation, and
saved state. Lobe extracts only the nearest post, including quoted-post
boundaries, media, author, canonical status URL, and an optional rendered
screenshot.

The selectors live in a versioned recipe. When a layout no longer matches, the
extension reports a compact semantic DOM sketch with no post text or handles.
The server can derive one replacement recipe with GPT-5.6 Luna, validate it,
cache it, and share it with every extension install.

## Monorepo

```text
apps/
  extension/   WXT extension, X capture, popup, and settings
  server/      Hono API and background worker
  web/         Searchable bookmark library and taste profile
packages/
  ai/          Vercel AI SDK classification, embeddings, and recipe repair
  db/          Drizzle schema, migration, repositories, and job queue
  shared/      Runtime schemas, intent metadata, messages, and recipes
  ui/          Shared shadcn primitives and Tailwind design tokens
```

The original product exploration is preserved in
[`lobe-brainstorm-report.html`](./lobe-brainstorm-report.html).

## Local setup

Requirements: [Bun](https://bun.sh/) and a [Neon](https://neon.tech) Postgres
database with the `vector` and `pg_trgm` extensions enabled.

```bash
bun install
cp .env.example .env
openssl rand -hex 24
```

Put the generated value in `LOBE_API_TOKEN` and your Neon connection string in
`DATABASE_URL`. Add `OPENAI_API_KEY` to use live AI classification and semantic
embeddings. The OpenAI key stays on the server and must never be put in a
`VITE_` or `WXT_PUBLIC_` variable.

Migrate the database, and optionally seed a demo library:

```bash
bun run db:migrate
bun run db:seed
```

Run the API and web app together:

```bash
bun run dev
```

Use `bun run dev:extension` separately while developing the Chrome extension.

Open [http://localhost:5173](http://localhost:5173), then connect with the same
`LOBE_API_TOKEN`.

### Load the Chromium extension

Build the unpacked extension:

```bash
bun run --filter '@lobe/extension' build
```

Then:

1. Open `chrome://extensions` in Chrome, Brave, Arc, Edge, or another Chromium
   browser.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select `apps/extension/.output/chrome-mv3`.
5. Open Lobe's extension settings and enter `http://localhost:8787` plus your
   `LOBE_API_TOKEN`.
6. Bookmark or unbookmark a post on X normally.

For live extension development, run `bun run dev:extension` instead.

## Save pipeline

```text
native X bookmark click
  -> persist capture and queue job in one transaction
  -> return 202 immediately
  -> classify intent in the worker
  -> create pgvector embedding
  -> mark ready and update the library
```

Intent is inferred as one of: Try it, Build similar, Learn, Reference, Buy, or
Share. A confident result stays silent. A low-confidence result shows a compact,
nonblocking prompt in the lower corner of X. The user can select the best intent
and explain why the post mattered, or dismiss the prompt and leave the save
marked as unsure. Submitted explanations are attached to the save and retrieved
through the post's vector as examples when similar posts are classified later.
Every unsure save also stays available in the library's Needs review queue.

Without an OpenAI key, the API remains usable with transparent deterministic
classification and PostgreSQL text search. It never presents fallback output as
an AI result.

## Validation

Run the complete local gate:

```bash
bun run check
```

The database integration suites are explicit because they require a reachable
`DATABASE_URL`:

```bash
bun run --filter '@lobe/db' test:db
bun run --filter '@lobe/server' test:db
```

Benchmark the indexed search path with 10,000 generated saves and a 200 ms
failure budget:

```bash
bun run benchmark:vector
```

The generated Chrome artifact is available under
`apps/extension/.output/chrome-mv3` after a build, or as a zip after
`bun run --filter '@lobe/extension' zip`.
