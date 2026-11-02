# Phase 01 — PokeAPI data layer

## Goal

The server delivers trustworthy domain data (types in `src/types/pokemon.ts`) and no UI knows what
the PokeAPI JSON looks like.

## What was built

- `server/pokeapi/client.ts`: base URL from `POKEAPI_BASE_URL`, `AbortSignal.timeout`, typed
  `PokeApiError`, 404 → `null`, in-flight request de-duplication, injectable cache.
- `server/pokeapi/cache.ts`: `PokeApiCache` interface + `MemoryCache` with TTL.
- `server/pokeapi/schemas.ts`: Zod schemas for only the fields we use.
- `server/pokeapi/mappers.ts`: API → domain (units, text cleanup, form classification, evolution tree).
- `server/pokedex/index.ts`: the Pokédex **index** — species + forms with types and generation from
  ~30 cached requests, instead of one request per Pokémon.
- `server/pokedex/service.ts`: `listPokemon`, `getPokemonDetail`, `getEvolutionChain`,
  `getTypeRelations`.
- `server/pokedex/next-cache.ts`: the only file that imports Next (`server-only`).
- Recorded fixtures (`yarn fixtures`) and Vitest coverage for client, cache, index, mappers, service.

## Concepts

### Framework-independent core

- **What:** `server/pokeapi`, `server/pokedex`, `lib/` never import `next/*`. The cache is an interface.
- **Why here:** phase 8 runs the same code from a plain Node MCP server.
- **Trade-off:** one extra seam (`requestInit`, `PokeApiCache`) instead of calling Next's cache
  directly. Enforced by an ESLint `no-restricted-imports` rule and a test that scans imports.

### Validate only what you use

Zod strips unknown keys. Schemas stay tiny, and a renamed API field fails in one place with a
readable message (`PokeApiError: Unexpected response shape for /pokemon/25`).

### The index

`/pokemon?limit` only returns names and URLs. Types come from the 18 `/type/{name}` endpoints (each
lists its Pokémon with a slot), generations from 9 `/generation/{id}` calls. Search, filter, sort and
paginate then become pure functions over ~1300 summaries.

### Species vs. variety

`raichu` and `raichu-alola` are two `/pokemon` entries of one species. Forms are matched to a species
by the longest species-slug prefix (`tauros-paldea-combat-breed` → `tauros`). Ids ≥ 10000 are forms.
Cosmetic varieties (caps, cosplay, totems…) are excluded by name.

## pt-BR coverage (checked against the live API)

`pokemon-species` has **no pt-BR** `flavor_text_entries`, `genera` or `names` (languages seen: ja,
ko, zh, fr, de, es, es-419, it, en). The mapper prefers `pt-BR` and falls back to `en`, so Brazilian
text will appear automatically if the API ever adds it. Types, stats, generations and evolution
triggers are translated by us (`config/messages.ts`, `describeTrigger`). Item names ("Thunder Stone")
stay in English because the API has no Portuguese for them either.

## Decisions

| Decision                            | Alternatives                     | Why                                                                                                                                                                      |
| ----------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `fetch` + `next.revalidate` (1 day) | `"use cache"` / Cache Components | Next 16 does not cache `fetch` by default; opting in per request is the smallest change and keeps the core free of directives. A process-wide `MemoryCache` sits on top. |
| Fixtures stripped by the schemas    | Raw recordings                   | 296 KB instead of several MB; fixtures can't drift from what we validate.                                                                                                |

## Gotchas

- `searchParams`-driven pages are dynamic, so the Data Cache (not static rendering) is what protects
  the PokeAPI. `/team` is `force-dynamic` so `next build` never calls the real API.
- Default Pokémon slugs aren't always the species slug (`deoxys-normal`); the service falls back
  from species slug to its default variety.

## How it was verified

Vitest: client (timeout/404/5xx/dedupe/no failure caching), cache TTL, index (forms, cosmetic
exclusion, slot order), detail mapping, evolution tree (Eevee ×8), type relations.
