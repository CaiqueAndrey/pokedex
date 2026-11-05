import { TEAM_BUDGET, TEAM_SIZE } from "@/config/gym";
import type { BattlePokemon } from "@/types/battle";
import type { PokemonDetail, StatName } from "@/types/pokemon";

export type TeamError = "size" | "duplicate" | "family";

/** Composition rules for every team, player or opponent (project-goal.md §8.8). */
export function validateTeam(team: readonly BattlePokemon[], size = TEAM_SIZE): TeamError[] {
  const errors: TeamError[] = [];
  if (team.length !== size) errors.push("size");
  if (new Set(team.map((p) => p.name)).size !== team.length) errors.push("duplicate");
  if (new Set(team.map((p) => p.family)).size !== team.length) errors.push("family");
  return errors;
}

/** Any Pokémon (forms included) as a fighter, from its detail: for battles outside the draft pool. */
export function toBattlePokemon(detail: PokemonDetail): BattlePokemon {
  const stats = Object.fromEntries(detail.stats.map((s) => [s.name, s.base])) as Record<
    StatName,
    number
  >;
  return {
    id: detail.id,
    name: detail.name,
    family: detail.evolutionChainId,
    baby: false,
    types: detail.types,
    stats,
    bst: detail.stats.reduce((sum, s) => sum + s.base, 0),
  };
}

export const teamBst = (team: readonly BattlePokemon[]) => team.reduce((sum, p) => sum + p.bst, 0);

const cheapestCache = new WeakMap<readonly BattlePokemon[], [number, number][]>();

/** Cheapest BST per family, ascending — used to keep a budget feasible for the remaining slots. */
export function cheapestByFamily(pool: readonly BattlePokemon[]): [number, number][] {
  const cached = cheapestCache.get(pool);
  if (cached) return cached;
  const cheapest = new Map<number, number>();
  for (const pokemon of pool) {
    const current = cheapest.get(pokemon.family);
    if (current === undefined || pokemon.bst < current) cheapest.set(pokemon.family, pokemon.bst);
  }
  const sorted = [...cheapest].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  cheapestCache.set(pool, sorted);
  return sorted;
}

/**
 * How the budget splits right now: what's used, what must stay reserved so the slots after this
 * pick can still be filled (cheapest unused families), and what's free for this round's pick.
 */
export function budgetPlan(
  team: readonly BattlePokemon[],
  pool: readonly BattlePokemon[],
  budget = TEAM_BUDGET,
  size = TEAM_SIZE,
) {
  const used = teamBst(team);
  const slotsAfter = Math.max(0, size - team.length - 1);
  const families = new Set(team.map((p) => p.family));
  const reserved = cheapestByFamily(pool)
    .filter(([family]) => !families.has(family))
    .slice(0, slotsAfter)
    .reduce((sum, [, bst]) => sum + bst, 0);
  const free = Math.max(0, budget - used - reserved);
  return { used, reserved, free, budget, slotsAfter };
}

/**
 * Can `candidate` join a team that already has `team`, leaving enough budget to fill the remaining
 * slots with the cheapest unused families?
 */
export function fitsBudget(
  candidate: BattlePokemon,
  team: readonly BattlePokemon[],
  pool: readonly BattlePokemon[],
  budget = TEAM_BUDGET,
  size = TEAM_SIZE,
): boolean {
  const used = new Set(team.map((p) => p.family));
  if (used.has(candidate.family)) return false;
  const slotsAfter = size - team.length - 1;
  const reserve = cheapestByFamily(pool)
    .filter(([family]) => !used.has(family) && family !== candidate.family)
    .slice(0, slotsAfter)
    .reduce((sum, [, bst]) => sum + bst, 0);
  return teamBst(team) + candidate.bst + reserve <= budget;
}
