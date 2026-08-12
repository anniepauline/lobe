# Lobe

Lobe turns deliberate saves into useful context for you and your AI tools. The
first integration mirrors X bookmarks, organizes each save by intent in the
background, and makes the resulting library searchable through the web app.

## Monorepo

- `apps/extension`: WXT Chrome extension for X
- `apps/server`: Bun and Hono API plus the durable background worker
- `apps/web`: React library and taste profile
- `packages/shared`: contracts and selector recipes
- `packages/db`: Drizzle schema and PostgreSQL access
- `packages/ai`: Vercel AI SDK, OpenAI categorization, embeddings, and recipe repair

The original product exploration is preserved in
`lobe-brainstorm-report.html`.

## Local setup

1. Copy `.env.example` to `.env` and set a private `LOBE_API_TOKEN`.
2. Add `OPENAI_API_KEY` when you want AI categorization and semantic search.
3. Run `bun install`.
4. Run `bun run db:up`, then `bun run db:migrate`.
5. Start the server with `bun run dev:server` and the web app with `bun run dev:web`.
6. Start the extension with `bun run dev:extension` and load the generated
   Chromium build when WXT opens the browser.

The API still works without an OpenAI key. Saves use a deterministic fallback
category and search falls back to PostgreSQL text matching, which keeps local
development usable without silently pretending AI ran.
