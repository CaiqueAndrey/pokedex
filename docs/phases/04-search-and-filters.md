# Phase 04 — Search, filters and sorting

## Goal

Find any Pokémon by name or number, filter, sort — all reflected in the URL.

## What was built

- `lib/search.ts`: accent/case/hyphen-insensitive matching (`mr mime` finds `mr-mime`), number
  queries (`25`, `#025`).
- `lib/filters.ts`: `parseFilters` (untrusted `searchParams` → safe defaults), `filtersToSearchParams`
  (omits defaults), `filterPokemon`, `sortPokemon`.
- `SearchBar` (client): 300 ms debounce, `router.replace`, `/` shortcut, clear button.
- `Filters` (client): up to two types, generation, forms (none/all/regional/mega/gmax/other), sort key
  and direction, "limpar filtros". Filter changes use `router.push`, so Back restores the previous
  filter; typing uses `replace` so history isn't flooded.
- Empty state with a clear-filters action.

## Concepts

### Parse, don't trust

`?gen=99&type=fire,fire,banana&page=-3` becomes `{ generation: undefined, types: ["fire"], page: 1 }`.
The same function serves server and client, and is unit tested.

### Syncing an input with the URL

Typing must not be overwritten by the URL echoing back an older value. `SearchBar` only adopts a URL
query when it differs from the last value it pushed itself (derived-state-during-render pattern, no
effect needed).

### Forms in the list

Alternative forms are hidden by default (`forms=none`); with "Todas as formas" the type filter finds
Raichu de Alola as Elétrico/Psíquico.

## How it was verified

Vitest for search/filter/sort/URL round-trip; Playwright for search → detail, number search, type +
generation filter with Back, empty state, forms.
