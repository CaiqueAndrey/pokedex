# Phase 17 — Less on screen, and a reason to chase legendaries

## Goal

Two pieces of feedback after Phase 16: screens (web and mobile) packed too much text together, and
legendaries had no clear payoff after the Master Ball. This pass moves secondary text behind tips
and dialogs, and turns legendaries into a loop worth coming back for.

## What was built

- **`InfoTip`** (`components/ui/info-tip.tsx`): an "ⓘ" disclosure. On phones its text opens as a
  sheet above the action bar, on wider screens as a bubble. Esc and a tap outside close it. The text
  stays in the DOM, hidden.
- **`ModalButton`** (`components/ui/modal-button.tsx`): a button that opens a dialog with longer
  content.
- **Hub:**
  - each challenge card keeps the essentials (art, prize, status, play); who you face, the field
    and the reward ladder moved to "Detalhes";
  - the daily card is one status line, with the streak rules in a tip;
  - the rules are a "Como funciona" dialog next to the title;
  - the missions are one line plus a dialog;
  - the last run is one line linking to the history;
  - the settings are a small right-aligned row.
- **Pre-battle:** "how the opponent plays" (scouting, counter-picks, replacements) and the order
  hint are tips; the field is a chip with a tip.
- **Draft, ambush and quiz:** the draft's budget legend, the ambush's difficulty and hand rules, and
  the quiz rules moved to tips.
- **The legendary loop:**
  1. A Master Ball opens an **encounter** whose three offers are fixed at the start, **uncaught
     legendaries first** (`encounterOffers`), so the collection grows.
  2. A caught legendary is **yours for good**: pick "Chamar X" in the hub's "Lendário neste desafio"
     and it starts in the first slot of any later gym run, without a Master Ball (`run.summon`).
  3. The 26 legendaries form **9 groups** (birds, beasts, towers, golems, Eon, weather, lake,
     creation, loners). Completing one gives a **Master Ball back** and 50 XP (`catchAndComplete`,
     `stats.legendSets`), plus the "Guardião de lendas" achievement.

  The draft announces each catch and every group completed. The hub panel shows your Master Balls,
  the collection, groups done and the caught sprites. "Como funcionam" explains the loop, the paths
  to the next Master Ball and each group's progress.

## Balance: does calling a legendary break the gyms?

Expert bot, 60 runs, bringing nothing / Cresselia (580) / Mewtwo (680):

| Mode | None | Cresselia | Mewtwo |
| ---- | ---- | --------- | ------ |
| Easy | 28%  | 30%       | 23%    |
| Hard | 3%   | 5%        | 10%    |

No: the strength cap leaves less for the other five slots, and scouting trainers build against it.
A legendary is a fun choice, not a sure win, so summoning needs no extra limit.

## Decisions

| Decision                                           | Alternatives considered         | Why                                                                                |
| -------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------- |
| Tips for explanations, dialogs for lists and rules | Collapsible sections everywhere | One tap, no layout jump, nothing pushes the play buttons down                      |
| Tip as a bottom sheet on phones                    | Anchored bubble everywhere      | No overflow off-screen next to the right edge                                      |
| Summon a caught legendary for free                 | One-time use                    | "Yours for good" is the payoff of catching; the cap keeps it fair                  |
| Groups pay a Master Ball back                      | XP only                         | Closes the loop: catching leads to the next encounter                              |
| Encounter offers fixed at the start                | Rolled when the round shows     | The caught list can change between start and draft; fixing it keeps reloads stable |

## Gotchas

- The settings row ended up in the bottom-left corner, under Next's dev overlay badge, so E2E clicks
  were intercepted. It is right-aligned now, with space below.
- A two-column group list put each count next to the following group's name; one column reads
  right.

## How it was verified

- Vitest: uncaught-first encounters, a group pays once, a summon fills the first slot and doesn't
  stack with an encounter.
- Playwright: details dialogs (ladder, fields), missions dialog, legends dialog and paths; an
  encounter catch → "Chamar X" next time → run shows "Lendário chamado"; completing the Eon group
  gives the Master Ball back; every earlier flow, plus axe in both themes.
- Screenshots: hub on a Pixel 7 profile (about 9 screens tall before, about 3 now) and on desktop;
  the field tip; the legends dialog.
