<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Pokédex — working agreements

`project-goal.md` (Portuguese) is the source of truth for _what_ to build. This file is the short
version of _how_ to work in the repo.

## Language

- UI text: **Portuguese**, always from `src/config/messages.ts`.
- Code, comments, commits, `docs/`: **English**.

## Architecture rules

- The PokeAPI is only ever called from the server, through `src/server/pokeapi/client.ts`.
  Components never see raw API JSON: `fetch → Zod → mapper → domain types → UI`.
- `src/server/pokeapi`, `src/server/pokedex` and `src/lib` are the **framework-independent core**:
  no `next/*`, no `server-only` (only `src/server/pokedex/next-cache.ts` may import Next). ESLint and
  `src/config/config.test.ts` enforce this so a future MCP server can reuse the core.
- Search, filters, sorting and pagination live in the URL (`searchParams`) and are pure functions in
  `src/lib/filters.ts`.
- Favorites, team and theme live in `localStorage` through `src/lib/storage.ts` (versioned keys +
  Zod validation) and are read with `useSyncExternalStore`.
- No databases, auth, Redis, React Query or Redux. If a real problem needs one, it becomes a phase.

## Quality bar (Definition of Done)

Typed (no `any`), `yarn lint`, `yarn format:check`, `yarn typecheck`, `yarn test` and `yarn build`
pass; error/loading/empty states exist; checked at phone width; basic accessibility; documented.

Tests never hit the real PokeAPI. Unit tests use `src/server/pokeapi/fixtures/pokeapi.json`
(re-record with `yarn fixtures`); E2E runs the app against `e2e/fixture-server.mjs`.

## Commits

Conventional Commits in English (`feat: add type filter`). Branches: `feat/*`, `fix/*`,
`refactor/*`, `chore/*`.
