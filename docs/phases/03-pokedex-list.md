# Phase 03 — Pokédex list

## Goal

All Pokémon browsable with numbered pagination and zero PokeAPI calls from the browser.

## What was built

- `app/page.tsx`: Server Component reading `searchParams` (a `Promise` in Next 16), filtering,
  sorting and paginating the cached index.
- `PokemonCard` (`next/image`, responsive `sizes`, `priority` only for the first row), `PokemonGrid`.
- `lib/filters.ts#paginate`: `1 … 4 5 6 … 43`, range text ("Mostrando 73–96 de 1025"), clamping.
  Out-of-range pages redirect to the last valid page.
- `loading.tsx` (skeleton grid), `error.tsx` (retry), `not-found.tsx`.
- E2E: open home, go to page 3, go back.

## Concepts

### Server Components + URL state

The list HTML is rendered on the server from the URL, so links are shareable, Back works and there
is no client data fetching or loading spinner logic. Pagination is plain `<Link>`s.

### `next/image` with remote artwork

The official artwork is ~475 px. `sizes` lets the browser pick a 176–400 px variant. `PokemonImage`
falls back to the default sprite and then to a text placeholder when a form has no artwork.

### The card link trick

The whole card is clickable through an `::after` overlay on the link, while the favorite button
sits above it (`z-10`) as a sibling — no interactive element nested inside a link.

## Gotchas

- The old project made 150 requests per visit and rendered ~150 times; now one HTML response.
- `aria-live` on the result count announces changes after filtering.

## How it was verified

Unit tests for `paginate`; Playwright (`e2e/pokedex.spec.ts`) for pagination and Back.
