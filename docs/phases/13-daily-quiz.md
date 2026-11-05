# Phase 13 — Daily quiz: "Quem é esse Pokémon?"

## Goal

A 30-second daily game that only needs the Pokédex: guess the Pokémon from its silhouette, the same
one for everyone each day, plus an endless practice mode. It feeds the same progress as the gym
(XP, Pokéballs, the streak of days). No new backend.

## What was built

- **`/quiz`** with two modes:
  - **Do dia:** five guesses. Each miss unlocks a hint (types → generation → first letter and length
    → a lighter silhouette), and each wrong guess shows what it tells about the answer (shared types,
    older or newer generation). Solving reveals the artwork with a jingle, gives XP and a Pokéball
    (a Great Ball within two guesses), and links to the Pokémon's page. Share text:
    `Quem é esse Pokémon? 05/11 · 2/5 / 🟥🟩 / …/quiz`.
  - **Infinito:** three guesses per Pokémon, optionally from one generation, as many in a row as
    you can. Only the best streak is saved.
- **Pure core** (`src/lib/quiz.ts` + `src/config/quiz.ts`): the pool (one entry per species), the
  day's answer from the date (generations 1–5, the most recognizable), guess matching and
  suggestions, clues, hints, status, rewards, the grid and the share text, the image token, and the
  saved-progress schema (`pokedex:quiz:v1`).
- **The picture through our own route**, `GET /api/quiz/image/[token]`: the token is an opaque
  base-36 number that decodes to the national number, so the page never contains
  `official-artwork/25.png`. The route fetches the artwork once a month (`next.revalidate`) and
  answers with an immutable cache header.
- **Accessible guess field:** an ARIA 1.2 combobox (arrow keys, Enter, Escape, `aria-activedescendant`),
  suggestions picked on `mousedown`, unknown or repeated names refused without costing a guess.
- **A streak across daily games:** a new `pokedex:played-days:v1` list. The streak is the union of
  those days and the gym's daily results (`playedDays`), so the old data keeps counting. Playing
  either daily game keeps it alive, and every third day still gives a Master Ball.
- **Doors in:** a "Quem é?" button in the header, a banner on the Pokédex home, and a card with
  today's status on the gym hub. New achievement: "Olho de treinador" (solve the daily quiz on the
  first guess). The reset (Phase 12) also clears the quiz.

## Concepts (what, why here, trade-off)

### Deterministic daily content without a server

- **What it is:** the answer is `hash("quiz|YYYY-MM-DD") mod candidates`, over a list sorted by
  number.
- **Why here:** everyone gets the same Pokémon on the same day without storing anything; tests can
  fix the clock (`page.clock.setFixedTime`) and know the answer.
- **Trade-off:** the answer is computable in the browser. Hiding it fully would need server-side
  guess checking; for a casual game, keeping it out of URLs and the network tab is enough.

### Saving the result with the guesses

- **What it is:** a finished day stores `result: "solved" | "failed"` next to its guesses.
- **Why here:** other screens (the gym hub card) show today's grid without the quiz pool, and a
  finished day refuses more guesses even after a reload.
- **Trade-off:** a value that could be derived is stored, but only once, when the day closes.

## Decisions

| Decision                                  | Alternatives considered | Why                                                                                     |
| ----------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| Daily answers from generations 1–5        | All 1025                | The newest generations are hard to recognize by shape; guesses still accept any species |
| Hints unlock on misses                    | Buy hints with points   | Simple and fair: everyone gets the same help at the same point                          |
| Clues per wrong guess (types, generation) | Only right or wrong     | Each miss teaches something, so the 5 guesses are a game and not a lottery              |
| Proxy route with a token                  | Plain sprite URL        | `…/25.png` in the page or network tab gives the answer away                             |
| Endless draws on click                    | Draw on mount           | A random draw during render would differ between server and client (hydration)          |

## Gotchas

- A listbox named like its input ("Seu palpite") makes `getByLabel` ambiguous and confuses screen
  readers: it is "Sugestões" now.
- Next's route announcer is also `role="alert"`: E2E checks the error text, not the role.
- The fixture PokeAPI has 63 species; with the clock on 2026-11-05 the answer is Wartortle. Re-record
  the fixtures and the E2E date or answer may need a new value (the test says how to find it).

## How it was verified

- Vitest: pool, daily answer (stable, varied, generations), matching ("Mr. Mime" typed three ways),
  suggestions, clues, hints, status, saving and closing a day, rewards, share text, image tokens,
  played-days union.
- Playwright: miss → hint → solve (reward, share, reload keeps the result) → gym hub card and streak;
  five misses; endless start; header and home entries; axe on `/quiz` in both themes.
- Screenshot on a Pixel 7 profile: silhouette, field and suggestions on the first screen.
