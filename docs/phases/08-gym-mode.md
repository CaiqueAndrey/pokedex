# Phase 08 — Gym mode (draft and battles)

## Goal

Gamify the Pokédex (project-goal.md §8.8): draft a team of 6 and win 5 simulated battles at the
Pewter Gym to earn the Boulder Badge. Fun first; not a faithful battle simulator.

## What was built

- `server/pokedex/battle-pool.ts`: the draft pool (generations 1–4, no legendaries/mythicals: 458
  Pokémon, 212 evolution families) from **one GraphQL request**, Zod-validated, memoized for a day,
  with a recorded snapshot (`data/battle-pool.json`, `yarn battle-pool:record`) as fallback.
- `lib/battle/` (pure, framework-free, reusable by the phase 11 MCP server):
  - `rng.ts`: mulberry32 + FNV-1a string hashing; every random choice derives from the run seed.
  - `damage.ts`: level-50 stats, "best own type" attack (STAB), simplified game damage formula,
    criticals, Struggle when immune.
  - `simulate.ts`: one-on-one sequential battle; fainted Pokémon replaced by the best matchup.
  - `team.ts`: `validateTeam` (no duplicates, one Pokémon per family) and the budget check.
  - `draft.ts`: the 7a0-style die (rolls a type, offers weak/mid/strong), budget-aware.
  - `opponents.ts`: random opponents under the same rules and budget, **no type bias**.
  - `run.ts`: the run state machine (`draft → ready → … → won | lost`).
- `config/gym.ts`: every tunable number (budget, offers, rerolls, crit chance, per-battle budget
  factors) and the trainers, with Brock last.
- `/gym`: rules + badge, draft board (animated die, live budget bar, shared-weakness hint), pre-battle
  (opponent team, reorder yours), animated battle (HP bars, log, "pular animação"), result screens.
- Artwork: Brock (`public/img/Brock.png`) on the intro and before the leader battle; the Boulder
  Badge (`public/img/insignia_rock.webp`) with a CSS shine animation once earned.
- Run and badges persisted in `localStorage` (`pokedex:gym-run:v1`, `pokedex:badges:v1`) through a
  new generic `createValueStore` (Zod-validated, `useSyncExternalStore`).

## Concepts

### Seeded randomness

`Math.random()` can't be replayed. A seeded PRNG makes the same seed produce the same draft
offers, opponents and battles. That is what makes the game testable (fixed seeds in Vitest and
Playwright), shareable (`/gym?seed=abc`) and cheat-resistant: the battle seed includes the team
order, and the outcome is saved **before** the animation, so reloading can't re-roll a defeat.

### Deriving state instead of storing it

The run stores only the seed and the player's decisions (picks, rerolls used, order, battle index).
Offers and opponents are recomputed from them. Less to persist, nothing to get out of sync.

### Budget as a balancing tool

The team BST cap plays the role of a salary cap. The first version got it wrong in two ways that
cancelled the cap out: it only _offered_ Pokémon that fit, and opponents were scaled from the
player's own team BST. Always taking the strongest offer cost nothing and gained nothing.

Now the cap only exists in **hard mode**: offers ignore it and the ones that don't fit come back as
`blocked` (shown, disabled), with at least one legal offer guaranteed; `fitsBudget` still reserves
the cheapest unused families for the remaining slots. **Easy mode has no cap** (`budget: null`):
the player drafts by taste and type. Opponents get a **fixed** per-mode budget.

The die is "friendly" (`rollType`): it only lands on types with at least three available families
and one mid-or-strong option that fits, and it prefers types the team doesn't have yet. Teams end
up covering ~9 types on average, and no round is a dead end.

Tuned with 200 simulated runs per row:

| Mode (player cap / opponents) | Random picks: badge | Strongest each round: badge |
| ----------------------------- | ------------------- | --------------------------- |
| Easy (none / 2500)            | ~25%                | ~85%                        |
| Hard (2500 / 2600)            | ~8%                 | ~18%                        |

A unit test keeps the ordering (hard < easy, drafting well > random) from regressing. Slaking
(670 BST) is a trap in the real games (Truant), but the engine has no abilities, so here it is
simply the most expensive pick.

### GraphQL vs REST for bulk data

The REST `/pokemon/{id}` payload is ~280 KB (full move list); the pool would need ~500 requests
(~70 MB) cold. One GraphQL query asks only for the needed fields: ~74 KB. Trade-off: the endpoint is
beta, hence the snapshot fallback. Note: `graphql.pokeapi.co/v1beta2` has a different schema; we pin
`beta.pokeapi.co/graphql/v1beta`.

## Balance (measured)

`battle.test.ts` simulates 400 runs with random picks:

| Metric               | Target    | Measured |
| -------------------- | --------- | -------- |
| Battle 1 won         | ≥ 60%     | 96.5%    |
| Boulder Badge earned | 10% – 50% | 27.3%    |

No tuning was needed. If a future change moves these numbers, adjust `config/gym.ts`, not the engine.

## Gotchas

- The API uses **modern typings**, so Fairy exists in the pool data (Clefairy is pure Fairy).
- Cross-generation families (Pichu→Pikachu→Raichu, Onix→Steelix) are handled by `evolution_chain_id`.
- Infinite scroll bug found while running the suite: a stale observer callback could request the
  same page twice. Fixed by tracking the loaded page in a ref.

## Refinements (second pass)

- **Modes** (`run.mode`): easy shows the opponent team in order, its total power and your base
  stats; hard hides the opponent. Same balance in both.
- **Run history** (`run.history`): each battle records both teams and how many were left standing.
  `RunPath` renders it as a track next to the pre-battle screen and on the result screen. Old saved
  runs parse fine thanks to Zod `.default()`.
- **Budget UX**: `budgetPlan()` splits the cap into used / reserved (cheapest unused families for
  the slots after this pick) / free. The UI shows the three parts, the max for this round and "sobra
  depois" per offer, and states that offers always fit.
- **Battle speed** (slow / medium / fast) stored with `createValueStore`.
- **Reordering**: HTML5 drag and drop for mice, tap-two-to-swap for touch and keyboard, arrows kept.
  Gotcha: Playwright's mobile emulation (touch) doesn't fire HTML5 drag events, so drag is tested in
  a desktop context, and dragging starts from the grip handle.
- **Digits font**: the pixel fonts have ambiguous digits, so a local Chakra Petch subset is applied
  through `unicode-range` (digits, `#`, `%`) in front of both font stacks. `adjustFontFallback: false`
  is required: the generated metric fallback ignores `unicode-range` and would take over all text.
- **Favicon**: `public/favicon.ico` regenerated from the Pokéball (16/32/48 px, PNG-in-ICO via sharp).

## How it was verified

Vitest (engine, rules over 200 seeds, balance over 400 runs, pool mapping and fallback); Playwright
with fixed seeds (`e2e0` wins the badge, `e2e6` loses battle 1), reload persistence, reroll, reorder;
axe on `/gym` in both themes.
