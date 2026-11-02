# Phase 06 — Favorites and team

## Goal

Persist favorites and a 6-slot team in the browser, with team coverage analysis.

## What was built

- `lib/storage.ts`: versioned keys (`pokedex:favorites:v1`, `pokedex:team:v1`) + Zod validation;
  corrupt or foreign data falls back instead of crashing.
- `lib/list-store.ts`: a small external store (subscribe / stable snapshot / empty server snapshot)
  used by `useFavorites` and `useTeam` through `useSyncExternalStore`; syncs across tabs through the
  `storage` event.
- Favorite button on every card and the detail page; `/favorites`.
- `/team`: six slots, add by search (picker), remove, clear; coverage table (weak / resist counts per
  attacking type) and a warning for weaknesses shared by 3+ members.
- `GET /api/pokemon` (our own route; validates with Zod) so client components can turn saved slugs
  into summaries without the browser ever calling the PokeAPI.

## Concepts

### `useSyncExternalStore` for localStorage

Reading `localStorage` during render breaks hydration; reading it in an effect causes a flash and a
lint error. An external store has a server snapshot (empty) and a client snapshot, and React
reconciles them correctly after hydration.

### Only slugs are stored

The store keeps names, not Pokémon objects. Data is re-hydrated from the (cached) index, so stale
copies can't exist and storage stays tiny.

## Decisions

| Decision                    | Why                                                                 |
| --------------------------- | ------------------------------------------------------------------- |
| API route for summaries     | Alternative was shipping all ~1300 summaries to the client.         |
| Team coverage on the client | Pure function over props (`TypeRelations` is ~2 KB), no round trip. |

## How it was verified

Vitest for storage fallbacks and coverage math; Playwright: favorite → reload → still favorited →
listed in `/favorites`; team of three shows counts and the shared-weakness numbers, remove works.
