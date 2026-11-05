# Phase 09 — Gym mode 2.0 (challenge, end of run, sounds, gamification)

## Goal

Make the gym mode a real challenge and a clearer, more rewarding loop (project-goal.md §8.9),
based on how it played in production: too easy, a confusing end of run, and "Novo desafio" skipping
the mode choice. A second pass (below) added Misty's gym, Team Rocket as the daily challenge,
trainers that study your team and Pokéballs as rewards. Out of scope: real moves, abilities, online
ranking and the between-battle rewards.

## What was built

- **Balance** (`config/gym.ts`, first pass; see the second pass for the final rules): a cap in both modes (easy 2 800, hard 2 500), a fixed
  opponent budget per mode, an optional `follow` factor (opponents track part of your team strength),
  and **counter-picking**: the trainer opens with its best answer to your lead
  (`opponents.ts#counterPick`). Brock always does it; in hard mode every trainer does.
- **Rules version** (`RULES_VERSION`, `run.rules`): a saved run from older rules is discarded with a
  notice instead of changing its opponents mid-run. v1 runs parse as version 1 via Zod `.default(1)`.
- **Battle stats** (`lib/battle/stats.ts`): damage (capped at the HP left, so no overkill) and
  knockouts per Pokémon, read from the event log. Every battle record now stores your damage map and
  the opponent's MVP.
- **End of run**: the deciding battle opens `RunResultDialog` (native `<dialog>` in
  `components/ui/dialog.tsx`) with the artwork, "venceu X de 5", who beat you, the MVP, new
  achievements, and **Ver histórico** / **Compartilhar** / **Novo desafio**. Wins in between show a
  short "Vitória! Próximo: …" next to the button. The history adds the score and MVP per battle.
- **Flow**: "Novo desafio" always goes back to the start screen, where the mode is a radio group with
  the last mode preselected. Abandoning asks for confirmation.
- **8-bit sounds**: original tunes as data (`lib/sound/tunes.ts`), synthesized by a Web Audio player
  (`features/gym/sound.ts`): square/triangle oscillators plus a noise buffer, no audio files. Die,
  pick, send-out, hits (normal, super effective, not very effective, critical), faint, win, loss and
  the badge fanfare. A "Som e vibração" toggle (`pokedex:sound:v1`) also gates phone vibration on
  criticals and on your Pokémon fainting.
- **Gamification** (`lib/battle/progress.ts`, all pure):
  - **Daily challenge**: seed `dia-YYYY-MM-DD` from the local date; the first attempt counts
    (abandoning uses it up). Results in `pokedex:gym-daily:v1` (last 30 days).
  - **Share**: spoiler-free text (`Ginásio de Pewter · Desafio do dia 05/11 · Fácil` /
    `🟩🟩🟥⬛⬛ 2/5` / link) via the Web Share API, or the clipboard.
  - **Lifetime stats** (`pokedex:gym-stats:v1`): runs, badges, battles won, best run, streaks,
    most drafted Pokémon.
  - **Achievements** (`pokedex:achievements:v1`): nine, from "Primeira vitória" to "Imparável"
    (3 badges in a row).
  - **Matchup hints** in easy mode: advantage / neutral / disadvantage of each of yours against the
    opponent's lead.

## Concepts

### Balancing with strategies, not with one random player

- **What it is:** the balance test simulates three players: random picks, always the strongest legal
  offer, and "smart" (strongest + the lead with the best matchup against the opponent's lead,
  enumerating every lead so counter-picks are accounted for).
- **Why here:** v1 only tested random picks and passed, while anyone picking strong offers in easy
  mode won the badge 85–95% of the time.
- **Trade-off:** the smart strategy costs six opponent generations per battle, so the test runs 100
  runs per row (~100 s). The sample is noisy (±5 points), so the assertions use bands and orderings.

Measured (100 runs per row, `battle.test.ts`):

| Mode | Random | Strongest | Smart | v1 (strongest / smart) |
| ---- | ------ | --------- | ----- | ---------------------- |
| Easy | 10%    | 51%       | 53%   | 85–89% / 95%           |
| Hard | 11%    | 21%       | 26%   | 19% / 31%              |

### Counter-picking instead of scaling opponents

- **What it is:** the opponent's lead depends on yours. Your order still matters (you choose who
  faces their answer), but you can no longer always open with a free win.
- **Why here:** it attacks the "smart" exploit directly, without touching budgets.
- **Trade-off:** in easy mode Brock's order changes as you reorder, so the pre-battle screen says
  so ("Brock escolhe quem abre depois de ver o seu titular").

### Synthesized audio

- **What it is:** each effect is a list of notes `{ freq, duration, wave, volume, slideTo }` that the
  player schedules on an `AudioContext`, with a 5 ms attack and an exponential decay to avoid clicks.
- **Why here:** zero downloads, no third-party licences, tunable in code and testable as data.
- **Trade-off:** browsers only allow audio after a gesture, so the context is created by the first
  sound (always after a click). Skipping the animation plays only the ending.

## Decisions

| Decision                                       | Alternatives considered        | Why                                                                                                                                          |
| ---------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Easy: cap 2 800, opponents 2 600, `follow` 0   | `follow` 0.4–0.5, cap 2 900    | `follow` narrowed the gap between drafting well and badly (random 16% / strongest 33%); the cap already weighs the player's strength choices |
| Hard: cap 2 500, opponents 2 500, counter-pick | 2 600 (v1), `follow` 0.3       | 2 600 + counter-pick dropped to 2–13%. `follow` 0.3 rescued weak teams (random 16%, above easy)                                              |
| Native `<dialog>`                              | Custom modal with a focus trap | Focus trap, inert background and `Esc` for free; `onCancel` routes `Esc` to "Ver histórico"                                                  |
| `shareText` in the core                        | In the component               | Testable in Node; `lib` may import `config/*` (no Next)                                                                                      |
| Rules version in the run                       | New storage key `gym-run:v2`   | Lets the UI explain why a run disappeared instead of silently dropping it                                                                    |
| Between-battle rewards                         | Implement now                  | Left out: it would shift the balance just tuned; worth its own pass with the same three-strategy test                                        |

## Gotchas

- `children ?? fallback` with `{cond && <X />}` renders `false`, not the fallback: pass `null`
  explicitly (`cond ? <X /> : null`). It hid the "Próxima batalha" button.
- E2E clicks before hydration are lost. The daily block only renders on the client (the server
  doesn't know the player's date), so the tests wait for it as a "hydrated" signal.
- Tuning scripts run with `tsx` must be CommonJS (`.ts`, no top-level await): as `.mts`, the script
  and `src/` loaded separate copies of `config/gym.ts`, so mutating the rules had no effect.
- The full E2E suite has 6–7 flaky `pokedex.spec.ts` failures locally when run in parallel against
  `next dev` (also on `main`); the file passes on its own.

## How it was verified

- Vitest: three-strategy balance bands, opponent budget, counter-pick, rules version, MVP and damage
  maps, stats, achievements, daily key/seed/history, share text, tune ranges and event mapping.
- Playwright (mobile): win → result dialog → history → reload → mode choice with stats and
  achievements; defeat → dialog → history → new run → mode choice; `Esc`; abandon confirmation; daily
  challenge used once; sound toggle remembered; no errors without Web Audio; axe on the result
  dialog in both themes.
- Screenshots at phone width (start screen, pre-battle, result dialog, history).

## Second pass: three gyms, scouting trainers, Pokéballs

Playing the first pass, the player still won easy and hard on the first try. A human drafts for
type coverage and reorders every battle, which beats every bot above. A fourth strategy, **expert**
(drafts for coverage and avoids shared weaknesses, then picks the best lead), measured 49% (easy)
and 21% (hard) on the first-pass rules.

### What changed

- **Scouting trainers** (`opponents.ts`, `rules.scout`): building its team, a trainer takes, `scout`
  of the time, the candidate near the per-slot budget with the best summed matchup against _your_
  team (`scoutScore`). It is a strong lever: at 0.5–0.8 almost nobody clears (≤ 4% for the expert).
- **Signature Pokémon**: Brock always brings Onix, Misty Starmie, James Weezing and Jessie Arbok.
  Leaders and bosses always counter-pick your lead.
- **Three gyms** (`config/gym.ts` → `GYMS`): easy = **Pewter** (Brock, Boulder Badge), hard =
  **Cerulean** (Misty, Cascade Badge), daily = **Team Rocket** (grunts, James, Jessie; no badge).
- **Trainer names drawn per run** (`trainersFor`): a class from the gym (Campista, Nadadora,
  Recruta Rocket…) plus a first name from `TRAINER_NAMES`, never repeated in a run. Leaders and
  bosses keep their names.
- **Pokéballs as rewards** (`rewardFor`): 3 wins a Poké Ball, 4 a Great Ball, clearing easy an Ultra
  Ball, clearing hard or the daily a Master Ball. Counted in the stats and shown on the start screen.
- **Achievements**: per-gym champions, "Colecionador" (both badges), "Sem um arranhão" (any leader
  without a faint) and "A bola definitiva" (a Master Ball). Unknown stored ids are ignored.
- **Badge component** (`GymBadge`): the badge image masks its own shine, so any shape works.

Final rules and measured clear rates (60 runs per row, `battle.test.ts`):

| Mode  | Cap   | Opponents | Scout | Counter-pick | Random | Strongest | Expert |
| ----- | ----- | --------- | ----- | ------------ | ------ | --------- | ------ |
| Easy  | 2 800 | 2 450     | 0.25  | leader only  | 3%     | 15%       | 30%    |
| Hard  | 2 500 | 2 400     | 0.15  | everyone     | 3%     | 5%        | 13%    |
| Daily | 2 650 | 2 400     | 0.15  | everyone     | 8%     | 27%       | 23%    |

The per-battle curve is now 90% → 110% in every mode. Hard gets a lower scout than easy because it
already hides the opponent and counter-picks every lead.

### Artwork

The new images had fake-transparency checkerboards (Misty, Jessie, the Cascade Badge, the Ultra
Ball) or flat white/gray backgrounds (James and the other balls). A one-off script flood-filled the
light, low-saturation background from the borders (it stops at the dark outline), removed enclosed
checkerboard pockets (both checker tones, nothing else), faded the light anti-aliasing halo, trimmed
the margins and saved PNGs. Pixel balls were scaled with nearest-neighbour and render with
`image-rendering: pixelated`. The JPEG badge needed a looser tolerance because of compression noise.

### Gotchas (second pass)

- Python heredocs through the shell tool broke on some quote sequences: one-off edit scripts went to
  files instead.
- `follow` stays at 0 everywhere; with scouting it would double-count the player's strength.

## Third pass: a hub with clear sections, rewards, practice and legendaries

Playing the second pass, the start screen didn't say what the gym mode _is_, what each challenge
gives, or why the daily challenge couldn't be started (it had already been played that day, by an
earlier build, and nothing said so). The layout now follows 7a0's structure.

### What changed

- **Hub** (`gym-hub.tsx`): a pitch ("Role o dado. Monte seu time. Vença o ginásio."), three steps
  (01 Role · 02 Monte · 03 Batalhe) and section links. Then **one card per challenge** (Pewter,
  Cerulean, Team Rocket) with who you face, **what you win** (badge, ball, the day's item) and your
  status. Picking a card is choosing the mode: the radio group is gone.
- **Daily challenge state**: today's result (grid + score), "Novo desafio em HH:MM:SS" (a clock store
  that ticks once per second, empty on the server) and **Treinar (não vale)**. Practice runs
  (`run.practice`) replay a seed without stats, rewards, achievements or daily results.
- **Archive** ("Desafios anteriores", like 7a0's "Volte no tempo"): the last 7 days, each with your
  result and a practice button.
- **Rewards section** (`gym-rewards.tsx`): badges, Pokéballs (how each is earned), the **bag**,
  **legendaries caught**, achievements and stats, each with a line on what it is and how to get it.
- **Bag (PokeAPI items)**: the daily challenge awards one item per day (`dailyItem`, from the date):
  evolution stones, Rare Candy, Nugget, Star Piece. Sprites and categories come from
  `/item/{name}` through the usual path (client → Zod `itemSchema` → `mapItem` → `GameItem`); the
  API has no pt-BR names, so those are curated in `REWARD_ITEMS`. If the API is down, the page still
  renders (no sprites).
- **Legendaries**: the pool query takes `$legendary` and a second snapshot
  (`data/legendary-pool.json`, 26 legendaries of generations 1–4, mythicals still out) is recorded
  with the regular one. The game pool is both lists, with `legendary: true` on the second.
  Legendaries **never** come from the die or a trainer's team. A **Master Ball** finally has a use:
  checking "Usar uma Master Ball" before a gym run spends it, and the first draft round becomes a
  **legendary encounter** (three legendaries that fit the cap). The pick is caught (stats) and shown
  in "Lendários capturados". The daily challenge doesn't allow it (everyone plays the same hand).

### What the PokeAPI does and doesn't have for rewards

| Wanted                      | In the API? | Used                                                   |
| --------------------------- | ----------- | ------------------------------------------------------ |
| Items (sprites, categories) | Yes         | The bag (`/item/{name}`)                               |
| Item prices                 | Mostly no   | `cost` is gone; `prices` is empty for most items       |
| Localized item names        | No pt-BR    | Curated in `config/gym.ts`                             |
| Legendary / mythical flags  | Yes         | Legendary pool (GraphQL `is_legendary`, `is_mythical`) |
| Badges, trainers, rewards   | No          | Curated (unchanged)                                    |

### Gotchas (third pass)

- **The pinned GraphQL endpoint went down** (`beta.pokeapi.co/graphql/v1beta` answers 522), so
  production was silently on the snapshot. The pool now uses `graphql.pokeapi.co/v1beta2`: same
  data, without the `pokemon_v2_` prefixes. The snapshot recorded from it is identical.
- The REST item `cost` field no longer exists (Zod caught it while recording fixtures).
- Small red text (`text-primary-600`) fails contrast on the light surface; labels use the red as a
  background with `text-on-primary` instead.
- A daily result recorded by an earlier build still counts for that day: that is why the Rocket
  battle couldn't be started on the day it was tested. The hub now says so and offers practice.
