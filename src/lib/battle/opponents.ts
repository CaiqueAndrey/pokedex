import { TEAM_SIZE } from "@/config/gym";
import type { BattlePokemon } from "@/types/battle";
import { pick, shuffle, type Rng } from "./rng";
import { fitsBudget, teamBst } from "./team";

/** How far from the per-slot target a pick may be before we widen the search. */
const TARGET_WINDOW = 60;

/**
 * A random opponent team built under the same rules as the player's (no duplicates, one Pokémon
 * per family) and close to `budget`, so battles are balanced but every trainer is different.
 * No type bias: any Pokémon in the pool can show up.
 */
export function generateOpponent(
  pool: readonly BattlePokemon[],
  budget: number,
  rng: Rng,
  size = TEAM_SIZE,
): BattlePokemon[] {
  const team: BattlePokemon[] = [];
  const shuffled = shuffle(rng, pool);
  while (team.length < size) {
    const target = (budget - teamBst(team)) / (size - team.length);
    const candidates = shuffled.filter((p) => fitsBudget(p, team, pool, budget, size));
    const near = candidates.filter((p) => Math.abs(p.bst - target) <= TARGET_WINDOW);
    const choice =
      pick(rng, near.length > 0 ? near : candidates) ??
      // Budget too tight to fit: take the cheapest unused family (never expected with real pools).
      [...pool]
        .filter((p) => !team.some((t) => t.family === p.family))
        .sort((a, b) => a.bst - b.bst)[0];
    if (!choice) break;
    team.push(choice);
  }
  return team;
}
