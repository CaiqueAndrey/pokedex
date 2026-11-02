# Phase 05 — Detail page

## Goal

`/pokemon/[name]` with everything in project-goal §8.3.

## What was built

- Form selector (each form has its own URL: `/pokemon/charizard-mega-x`).
- Artwork with normal/shiny toggle and a cry player; artwork fallback chain.
- Height/weight conversion, abilities (hidden marked), flavor text, genus, base-stat bars + total.
- `lib/type-effectiveness.ts`: multipliers from `damage_relations`, grouped into 4×/2×/½×/¼×/0×.
- Evolution tree (Eevee branches, no-evolution case), each step a link; previous/next navigation.
- `generateMetadata`, `notFound()` for unknown names, `loading.tsx`.

## Concepts

### Type effectiveness is multiplication

`damage_relations` describes what a type deals _to_ others. For a defender with types A and B the
multiplier of attacker X is `X→A × X→B`, with absent entries meaning 1. That naturally gives 4×,
¼× and lets an immunity (0) cancel a weakness. Tests: Charizard 4× rock, Gengar immune to normal
and fighting, Skarmory ¼× grass, Water/Ground immune to electric.

### Request de-duplication

`React.cache` shares the detail lookup between `generateMetadata` and the page for one request.

### Recursive component

`EvolutionChain` renders a tree with a recursive `Node`; the layout flips from column to row at `md`.

## Gotchas

- Species slug and default variety slug can differ (`deoxys` / `deoxys-normal`): the service resolves
  both. Names are URL-decoded before lookup.
- Meter bars use `role="meter"` with min/max/now for screen readers.

## How it was verified

Vitest for effectiveness and detail/evolution mapping; Playwright for forms, Mega X, evolution
navigation, no-evolution Pokémon, unknown name and next/previous.
