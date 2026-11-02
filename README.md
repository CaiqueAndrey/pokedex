# Pokédex

A Pokédex built with the [PokeAPI](https://pokeapi.co/): all 1025 species plus alternative forms
(regional, Mega, Gigantamax), with search and filters in the URL, a rich detail page (stats,
evolutions, weaknesses), favorites, a team builder with coverage analysis, and a side-by-side
comparison. The UI is in Portuguese; code and docs are in English.

This is a study project. The plan lives in [`project-goal.md`](project-goal.md) (Portuguese), the
per-phase learning notes in [`docs/phases/`](docs/phases/) and the status in [`PHASES.md`](PHASES.md).

## Stack

Next.js 16 (App Router, Server Components) · React 19 · TypeScript strict · Tailwind CSS 4 · Zod 4 ·
Vitest · Playwright (+ axe) · ESLint 9 · Prettier · Husky · Yarn 4.

## Getting started

```bash
corepack enable
yarn install
cp .env.example .env.local   # optional: POKEAPI_BASE_URL
yarn dev                     # http://localhost:3000
```

## Scripts

| Script                | What it does                                             |
| --------------------- | -------------------------------------------------------- |
| `yarn dev` / `build`  | Run / build the app                                      |
| `yarn lint`           | ESLint                                                   |
| `yarn format[:check]` | Prettier                                                 |
| `yarn typecheck`      | `tsc --noEmit`                                           |
| `yarn test`           | Vitest unit tests (use recorded fixtures, never the API) |
| `yarn test:e2e`       | Playwright against a local fixtures server               |
| `yarn fixtures`       | Re-record `src/server/pokeapi/fixtures/pokeapi.json`     |

## How it works

```text
PokeAPI → fetch (cached 24 h) → Zod → mappers → domain types → Server Components
```

- The browser never calls the PokeAPI (fair use): the server builds a light index (~30 cached
  requests) and search, filters, sorting and pagination are pure functions over it.
- The data core (`src/server/pokeapi`, `src/server/pokedex`, `src/lib`) does not depend on Next.js,
  so it can be reused by other consumers (a future MCP server).
- Favorites, team and theme live in `localStorage` (versioned keys, Zod-validated).

## Screenshots

Screenshots are produced from the running app and are not committed yet; run `yarn dev` to see the
list (`/`), detail (`/pokemon/charizard`), team (`/team`) and comparison (`/compare`) pages.

## Credits

Data from [PokeAPI](https://pokeapi.co/). Pokémon and related names are trademarks of Nintendo,
Game Freak and The Pokémon Company. Non-profit study project.
