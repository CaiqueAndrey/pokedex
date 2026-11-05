# Phase 14 — Rocket ambush (the new daily challenge)

## Goal

Replace the daily gauntlet (pick 6 of 12, five battles with HP carried over) with a short, fair
puzzle: everything in the open, a few attempts, and a difficulty calibrated per day. The gym engine
is reused as is.

## Why the gauntlet went away (measured)

Simulating **every** legal team of the old daily (6 of the 12, with the best lead each battle), the
share that cleared all five battles ranged from **3% to 48%** across 14 days (2026-10-23 to
2026-11-05; that day: 10%). The cap barely mattered (≈ 909 of 924 combinations fit), and since a
battle is deterministic for a team and order, retrying with the same team gave the same loss.

## What was built

- **`/gym/emboscada`**: Jessie and James show their four Pokémon (Arbok and Weezing plus two drawn
  from the pool) **in fighting order**. You pick **3 of the day's hand of 8**, in order, within a
  strength cap of 1 250, and get **3 attempts**. Each attempt plays the battle (skippable), then
  lists the outcome, how many of theirs fell and who held you back ("Arbok segurou o seu time").
  Trying the exact same team and order again is blocked (it would lose the same way).
- **Calibration** (`calibrate` in `lib/battle/puzzle.ts`): for a date, seeds `rocket|date|0`, `|1`, …
  build a candidate (hand + opponent); its **win rate** is the share of all legal ordered teams that
  win. The first seed with a rate in **10–25%** becomes the day's puzzle (else the closest). The page
  shows it: "Hoje, cerca de 23% dos times possíveis vencem."
- **Rewards:** winning on attempt 1/2/3 gives an Ultra/Great/Poké Ball, the day's item and the
  "Decolando de novo" achievement; the first attempt counts the day for the streak.
- **Saved as you go** (`pokedex:rocket:v1`): attempts are stored immediately, so leaving or reloading
  never gives a free retry. Past days (`?dia=YYYY-MM-DD`, from the hub's archive) and today after it
  is over are **practice**: same puzzle, nothing saved.
- **Share:** `Emboscada Rocket 05/11 · 2/3` plus one row of squares per attempt (Rocket Pokémon
  knocked out).
- The hub's daily card, its archive and the "next step" link to the ambush; the old hand screen and
  the HP-per-member pre-battle UI were removed. `RULES_VERSION` went to 3, so an in-progress gauntlet
  run saved by an older build is discarded with the usual notice. The gauntlet engine stays in
  `lib/battle` (old history entries and its tests still use it).

## Concepts (what, why here, trade-off)

### Calibrating content by brute force

- **What it is:** enumerate the whole decision space (≈ 150–300 legal ordered teams), simulate each,
  and accept a seed only if the outcome distribution is in range.
- **Why here:** a fair daily puzzle needs a guaranteed solution that isn't obvious; the space is
  small enough to check exhaustively in the browser (≈ 30 ms per day, ≈ 3 seeds tried on average).
- **Trade-off:** the rate measures "a random legal team", not a human; still, it removes impossible
  and trivial days, which is what the old daily lacked. Memoized per date.

## Tuning (60 days, `snapshotPool`)

| Cap   | Legal teams (of 336) | Days in 10–25% | Seeds tried (avg / max) | Time per day |
| ----- | -------------------- | -------------- | ----------------------- | ------------ |
| 1 350 | ≈ 300                | 60 / 60        | 2.7 / 12                | 40 ms        |
| 1 250 | ≈ 130–280            | 60 / 60        | 2.9 / 17                | 32 ms        |
| 1 200 | ≈ 100–260            | 60 / 60        | 2.8 / 14                | 25 ms        |

1 250 was kept: about half the teams fit, so the cap is a real choice without making it a math
exercise. The unit test checks 30 days stay in range.

## Decisions

| Decision                     | Alternatives considered | Why                                                                                                 |
| ---------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| Open information, 3 attempts | Hidden team, 1 attempt  | With a deterministic engine, retries are only interesting if the player can reason about the change |
| 3 of 8, in order             | 6 of 12                 | 336 ordered teams fit on a phone and in a brute-force check; each pick matters                      |
| Block an identical retry     | Allow it                | It can only repeat the loss; the message teaches that order matters                                 |
| Show the day's win rate      | Hide it                 | It sets expectations (and is the same for everyone)                                                 |
| Keep the gauntlet engine     | Delete it               | Saved history entries still render old daily runs                                                   |

## Gotchas

- A puzzle's opponent must not depend on the player's picks (the gyms' trainers "scout" you):
  otherwise the revealed team would change as you choose.
- The hand excludes the bosses' families and the opponent excludes the hand's, so nobody fights its
  own evolution.

## How it was verified

- Vitest: the same puzzle all day; legal teams respect order and cap; 30 calibrated days in range;
  deterministic attempts and both outcomes possible; attempts close the day; rewards; grid and share.
- Playwright (clock fixed on 2026-11-05): hub → ambush → attempt → back; hub shows the progress, the
  streak and no second "play" button; archive practice; the blocked retry; axe on `/gym/emboscada`.
- Screenshot on a Pixel 7 profile.
