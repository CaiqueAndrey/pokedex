# Phase 15 — Game depth

## Goal

More decisions inside a gym run (not just the draft and the lead) without losing the balance tuned
in Phase 9: pick your replacements, choose a reward after each win, use the bag, and fight on each
gym's own field.

## What was built

- **Your replacements.** When one of your Pokémon faints and more than one could come in, the battle
  pauses: the options show their HP and matchup against the opponent on the field, the best matchup
  is marked "Recomendado" and is one tap away in the action bar. Skipping the animation stops at the
  next decision.
- **The battle is saved while it happens** (`run.battling = { choices }`): a reload resumes the same
  battle with the picks made so far, instead of returning to the pre-battle screen (where you could
  reorder after seeing it). The result is applied when the battle ends.
- **Rewards between battles** (gyms only): after a win, choose one of three, or skip:
  - **Treino:** +10% Attack, Special Attack and Speed for one Pokémon, for the rest of the run;
  - **Item:** one bag item, the same for a seed and battle;
  - **Doce Raro** (easy) or **Espionar** (hard): evolve someone now, or see the next hidden team.

  "Batalhar!" waits until the reward is settled.

- **A useful bag.** Between battles, stones and the Rare Candy evolve a team member (same slot,
  order and training; the item is spent). During the draft, a Nugget or a Star Piece buys one more
  reroll once the free one is used (up to three per run).
- **Fields.** Pewter: rocky ground (Rock and Ground hits ×1.2). Cerulean: rain (Water ×1.2,
  Fire ×0.8). Both sides, shown on the hub cards and before each battle.

## Concepts (what, why here, trade-off)

### Interactive, yet pure and replayable

- **What it is:** `simulateBattle(…, { choices })` takes your picks as data. Each time a player
  Pokémon faints with more than one option, the result records a `ChoicePoint` (event index,
  options, the automatic pick, the one used). A missing pick falls back to the automatic one.
- **Why here:** the engine stays a pure function (tests, the MCP tool and the bots are unchanged).
  The UI plays events up to the next unanswered choice point, and after a pick it re-simulates with
  one more choice. The RNG consumes the same values up to that faint, so the events before it are
  identical and the animation just continues.
- **Trade-off:** each pick re-runs the whole battle. That is fine at this size: a few hundred events
  at most.

### Simplified evolution data

- **What it is:** the next stage is the family member with the next higher stat total. A stone works
  when that evolution has one of the stone's types (Water Stone + Eevee → Vaporeon, + Charmander →
  nothing); the Rare Candy always works.
- **Why here:** the battle pool already has the family, types and totals. The real triggers
  (`/evolution-chain`) would mean another API dataset for a casual mechanic.
- **Trade-off:** a few branches differ from the games (stone/type pairs are curated in
  `ITEM_EFFECTS`).

## Balance (measured, 60 runs per row)

| Mode                          | Random | Strongest | Expert | Expert + rewards (train/evolve the lead) |
| ----------------------------- | ------ | --------- | ------ | ---------------------------------------- |
| Easy (rocky ground)           | 8%     | 17%       | 32%    | 42%                                      |
| Hard (rain ×1.3 / ×0.7)       | 3%     | 3%        | 7%     | 17%                                      |
| Hard (rain ×1.2 / ×0.8, kept) | 3%     | 7%        | 7%     | 13–17%                                   |

Before the fields: easy 5% / 23% / 38%, hard 5% / 12% / 10%. The fields make Misty's gym harder
(her team leans on Water); the rewards give back what a thoughtful player loses. The balance test
gained the "rewarded" strategy with ceilings (easy ≤ 60%, hard ≤ 35%) so rewards can't make a gym a
sure thing.

## Decisions

| Decision                               | Alternatives considered          | Why                                                                                  |
| -------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| Pause only when there is a real choice | Pause at every faint             | One option means nothing to decide                                                   |
| Save the battle in progress            | Save the outcome first (Phase 9) | With choices the outcome isn't known up front; saving the picks keeps reloads honest |
| Rewards gate the next battle           | Optional panel                   | A clear "next step"; skipping is one tap                                             |
| Scout only where teams are hidden      | Everywhere                       | In easy mode the next team is already visible                                        |
| Training doesn't change the stat total | +10% total                       | Budgets and opponent strength stay as tuned                                          |

## Gotchas

- `messages.gym.choose` already existed (the draft's "Escolher X"), so the new copy is `replace`.
- The bag dialog lists every item × member pair that works; spending happens in the store before
  the run changes, so a double tap can't evolve twice with one candy.

## How it was verified

- Vitest: evolution rules (nearest stage, stones by type, legendaries excluded), usable items,
  training, rerolls bought, rewards (gate, train, skip, scout in hard, deterministic item),
  evolution keeps slot/order/training, choice points (replay prefix, invalid pick), field damage,
  battle in progress saved and cleared. Balance test with the fourth strategy.
- Playwright: choose a replacement, reload mid-battle resumes it; reward → training mark; Rare
  Candy and Nugget; fields on the hub and before battles; all earlier gym flows with the updated
  helpers (rewards skipped, the recommended Pokémon sent in).
- Screenshots on a Pixel 7 profile: the choice panel and the reward picker.
