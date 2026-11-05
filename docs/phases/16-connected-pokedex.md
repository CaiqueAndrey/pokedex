# Phase 16 — Connected Pokédex

## Goal

Tie the two halves of the app together: what you do in the games shows up in the Pokédex, and
Favorites, Meu time and Comparar get a purpose beyond being lists. Plus reasons to come back each
week, and link previews now that the app is public.

## What was built

- **Seen and used** (`pokedex:dex-progress:v1`, `lib/dex-progress.ts`): species you faced in a gym
  run or the ambush, or revealed in the quiz, are **seen** (an eye on the Pokédex card); the ones on
  your team are **used** (a star). The home page has "Sua Pokédex" (seen / used of 1025, with a bar
  per generation), and each Pokémon's page says what it did in your games ("Usado 3 vezes no
  Ginásio").
- **Meu time → friendly battle**: your team (any Pokémon, forms included) against Brock or Misty,
  with the gym's rules and field and your replacement picks. `GET /api/friendly` builds both teams
  on the server (details through the service, leader team from the battle pool). The browser
  simulates it with the same engine. Nothing is saved.
- **Favorites**: marked "♥ Favorito" in draft offers and the ambush hand. On the Trainer Card, the
  partner can be any favorite (otherwise the most drafted Pokémon).
- **Comparar com…** on every Pokémon page (`/compare?a=name`).
- **Weekly missions** (`lib/missions.ts`, `pokedex:missions:v1`): three per ISO week, the same for
  everyone (drawn from the week key). They are fed by the games: battles won, a badge, quiz days,
  ambush wins, evolutions, an endless streak. Claiming one gives a Great Ball and 30 XP. Shown on the
  hub and the Rewards tab.
- **Achievements**: three are secret ("???") until unlocked. "Imparável" and "Colecionador" show
  their progress (2/3, 1/2).
- **Link previews** (`opengraph-image.tsx`) for the home, the gym, the quiz and every Pokémon
  (number, name, types and artwork), from one shared `OgCard`.
- The reset (Phase 12) also clears the Pokédex progress and the missions.

## Concepts (what, why here, trade-off)

### Client-only state next to server-rendered lists

- **What it is:** the Pokédex list is server-rendered from the URL; seen/used lives in
  `localStorage`. The marks are tiny client components (`DexMark`) inside the server card, filled in
  after hydration.
- **Why here:** filters stay pure and shareable in the URL, while personal progress never leaves the
  browser (no account, no backend).
- **Trade-off:** no "only the ones I used" URL filter: the server can't know. A client-side filter
  would fight the server pagination, so it was left out.

### `next/og` image routes

- **What it is:** `opengraph-image.tsx` files that return an `ImageResponse` (JSX → PNG). Next wires
  the `og:image` meta tags. In this version `params` is a Promise, like in pages.
- **Why here:** shared links in chats show the Pokémon or the game instead of a bare URL.
- **Trade-off:** only a subset of CSS (flexbox, no grid); the Pokémon artwork is fetched when the
  image is first rendered, then cached.

## Decisions

| Decision                              | Alternatives considered                               | Why                                                                           |
| ------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| Seen/used by national number          | By slug                                               | Quiz, gym and ambush all know the number; generations come from number ranges |
| Using counts as seeing                | Separate counters                                     | "Seen" is the bigger set, like in the games                                   |
| Friendly teams built on the server    | Ship the whole pool and every form's stats to `/team` | Forms need details from the API; the server already caches them               |
| ISO weeks for missions                | Rolling 7 days                                        | Everyone shares the same week and the same three missions                     |
| "Aleatório" off the header (Phase 12) | Keep it                                               | It lives where it shuffles: the Pokédex ("Surpreenda-me")                     |

## Gotchas

- `rename` used to rebuild the trainer object, which would drop the new `partner`: both now keep
  each other's fields.
- An OG kicker in the type's color (yellow on cream) was unreadable: the type color stays in the
  band and the text is dark.

## How it was verified

- Vitest: ISO weeks (including 2021-01-01 → 2020-W53), weekly draw, add/max/cap/claim, a new week;
  seen/used merge and per-generation counts; the friendly leader's team (size, signature,
  deterministic); achievement progress.
- Playwright: quiz → seen on the home summary, card and detail page → "Comparar com…"; friendly
  battle from Meu time; favorite tag in the draft and the partner on the card; missions on the hub
  and Rewards; secret achievements. OG routes return PNGs and the detail page links its image.
