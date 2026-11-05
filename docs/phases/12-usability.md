# Phase 12 — Usability and clarity

## Goal

Make the next step obvious and reachable on a phone: the primary action pinned to the bottom of the
screen, less chrome above the game, and clear paths to the rewards. No rule or balance changes.

## What was built

- **`ActionBar`** (`components/ui/action-bar.tsx`): the screen's primary action, `sticky bottom-0`,
  full width on phones (right-aligned from `sm`), with an optional one-line hint. Used for
  "Batalhar!" (with "Abre a batalha: X"), "Pular animação" / "Próxima batalha", the daily hand's
  "Enfrentar" (with the counter and budget bar) and the finished run's "Compartilhar" / "Novo
  desafio".
- **Header:** one line on phones (smaller logo, the gym button, theme, and a `<details>` menu with
  Favoritos, Meu time and Comparar). It slides away while scrolling down on phones and comes back on
  the way up (`AutoHideHeader`). "Aleatório" left the header: it is now "Surpreenda-me" on the
  Pokédex itself.
- **Gym tabs:** one row of four on phones (icon over label); the level chip only from `sm` up. While
  drafting, ordering or battling the tabs disappear: `GymGame` publishes a "focus" flag through a
  tiny in-memory store (`setGymFocus` / `useGymFocus`) that the layout's `GymTabs` reads.
- **Draft:** the offers come right after the die, as sideways cards on phones (`GymPokemon row`);
  the budget is one line plus a bar, with the legend and rules behind "Como funciona o limite?". The
  team is a strip of six slots.
- **Pre-battle:** compact rows (number, sprite, name, types, matchup, stats, arrows) instead of
  cards, the opponent in three columns, and the first slot outlined as the lead.
- **Hub:** a "Próximo passo" card from the pure `nextStep` (first visit → easy gym; then today's
  daily; a Master Ball → legendary encounter; the missing badge; else replay). The full pitch and the
  three steps only show until the first run; mode buttons are full width; the rules are collapsed.
- **First-run tips** (`Tip`, `pokedex:gym-tips:v1`): inline callouts for the draft, the order and the
  daily hand, each dismissed once with "Entendi".
- **Reset** ("Zona de perigo" on the Trainer tab): a dialog that lists what is lost and enables the
  button only after typing APAGAR. `resetGymProgress` clears every gym store and keeps favorites,
  team, theme, sound and speed.
- **Legendaries:** the copy no longer says the daily challenge gives a Master Ball. The hub lists both
  real paths (clear the hard gym; three days in a row of daily challenge) with live progress.

## Concepts (what, why here, trade-off)

### Sticky action bar instead of a fixed one

- **What it is:** `position: sticky; bottom: 0` keeps the bar at the bottom of the viewport while its
  container is on screen, and lets it settle at the end of the content.
- **Why here:** no extra padding hacks for content hidden behind a `fixed` bar, and the bar goes away
  naturally when its screen does (the run path below the pre-battle grid still shows above it).
- **Trade-off:** it only sticks within its parent's box, so it has to be rendered at the screen's top
  level (that is why "Batalhar!" moved from `PreBattle` up to `GymGame`).

### Cross-tree UI state without context

- **What it is:** a module-level value with listeners, read with `useSyncExternalStore`.
- **Why here:** the gym tabs live in the route's layout and the game state in the page; a context
  provider would have to wrap both. The flag is ephemeral, so it isn't persisted.
- **Trade-off:** a global; the game resets it on unmount so another page never inherits it.

## Decisions

| Decision                                 | Alternatives considered                 | Why                                                                            |
| ---------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------ |
| Phone header: gym + theme + menu         | Shrinking every icon; horizontal scroll | Fits 360 px in one line and scales as destinations grow                        |
| Hide header on scroll down (phones only) | Always visible; never sticky            | Gives the screen back while reading, one flick brings it back                  |
| Hero only before the first run           | Always; never                           | Newcomers need the pitch, returning players need the button                    |
| Reset confirmation by typing a word      | A second "are you sure?" dialog         | Nothing else in the app is that destructive; a tap can't trigger it            |
| Red only as fill/border on `surface`     | Red small text                          | `#DC2626` on `#F6F6F8` is ~4.2:1, under WCAG AA for small text (axe caught it) |

## Gotchas

- The project's `cn` joins classes without tailwind-merge: passing `min-h-9` to a `Button` that has
  `min-h-11` is a coin toss. Don't override conflicting utilities through `className`.
- Playwright couldn't click the menu's sr-only label (the SVG intercepts it): click the `summary`.
- The "1 Issue" badge in E2E screenshots is Next's dev overlay showing the expected server log "using
  snapshot (GraphQL responded 404)" from the fixture server, not an app error.

## How it was verified

- Before/after screenshots on a Pixel 7 profile (412 px): the draft offers and the fight button are on
  the first screen; the header is one line.
- Vitest: `nextStep` (first visit, daily, Master Ball, missing badges, replay).
- Playwright: next step → draft (tabs hidden, tip dismissed) → action bar fight button in viewport;
  legendary paths; reset with the confirmation word (favorites kept); phone menu; existing gym, a11y
  (axe, both themes) and Pokédex suites.
