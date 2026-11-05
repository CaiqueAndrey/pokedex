import { TEAM_SIZE } from "@/config/gym";
import type { BattlePokemon } from "@/types/battle";
import type { TypeRelations } from "@/types/pokemon";
import { matchupScore } from "./damage";
import { pick, shuffle, type Rng } from "./rng";
import { fitsBudget, teamBst } from "./team";

/** How far from the per-slot target a pick may be before we widen the search. */
const TARGET_WINDOW = 60;

export interface Scouting {
  /** The player's team, which the trainer builds against. */
  team: readonly BattlePokemon[];
  relations: TypeRelations;
  /** 0–1: how often a slot goes to the best counter instead of a random candidate. */
  focus: number;
}

/** How well `candidate` does against a whole team: summed type matchups (offense − defense). */
export function scoutScore(
  candidate: BattlePokemon,
  team: readonly BattlePokemon[],
  relations: TypeRelations,
): number {
  return team.reduce((sum, member) => sum + matchupScore(candidate, member, relations), 0);
}

/**
 * An opponent team built under the same rules as the player's (no duplicates, one Pokémon per
 * family) and close to `budget`, so battles are balanced but every trainer is different.
 *
 * Without `scouting` there is no type bias: any Pokémon in the pool can show up. With it, each slot
 * goes, `focus` of the time, to the candidate near the per-slot target that best counters the
 * player's team: the trainer "studied" you. `signature` Pokémon (a leader's ace) come first.
 */
export function generateOpponent(
  pool: readonly BattlePokemon[],
  budget: number,
  rng: Rng,
  size = TEAM_SIZE,
  { scouting, signature = [] }: { scouting?: Scouting; signature?: readonly BattlePokemon[] } = {},
): BattlePokemon[] {
  const team: BattlePokemon[] = [];
  for (const ace of signature) if (fitsBudget(ace, team, pool, budget, size)) team.push(ace);
  const shuffled = shuffle(rng, pool);
  const scores = new Map<string, number>();
  const score = (p: BattlePokemon) => {
    if (!scouting) return 0;
    let value = scores.get(p.name);
    if (value === undefined) {
      value = scoutScore(p, scouting.team, scouting.relations);
      scores.set(p.name, value);
    }
    return value;
  };
  while (team.length < size) {
    const target = (budget - teamBst(team)) / (size - team.length);
    const candidates = shuffled.filter((p) => fitsBudget(p, team, pool, budget, size));
    const near = candidates.filter((p) => Math.abs(p.bst - target) <= TARGET_WINDOW);
    const options = near.length > 0 ? near : candidates;
    const studied =
      scouting && rng() < scouting.focus
        ? options.reduce<BattlePokemon | undefined>(
            (best, p) => (!best || score(p) > score(best) ? p : best),
            undefined,
          )
        : undefined;
    const choice =
      studied ??
      pick(rng, options) ??
      // Budget too tight to fit: take the cheapest unused family (never expected with real pools).
      [...pool]
        .filter((p) => !team.some((t) => t.family === p.family))
        .sort((a, b) => a.bst - b.bst)[0];
    if (!choice) break;
    team.push(choice);
  }
  return team;
}

/**
 * The trainer sees your lead and opens with its best answer (same type heuristic as switching in);
 * ties keep the generated order. The rest of the team keeps its order.
 */
export function counterPick(
  team: readonly BattlePokemon[],
  playerLead: BattlePokemon | undefined,
  relations: TypeRelations,
): BattlePokemon[] {
  if (!playerLead || team.length === 0) return [...team];
  let best = 0;
  let bestScore = Number.NEGATIVE_INFINITY;
  team.forEach((pokemon, index) => {
    const score = matchupScore(pokemon, playerLead, relations);
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return [team[best] as BattlePokemon, ...team.filter((_, index) => index !== best)];
}
