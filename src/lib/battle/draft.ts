import { OFFERS_PER_ROUND, TEAM_BUDGET } from "@/config/gym";
import type { BattlePokemon } from "@/types/battle";
import { POKEMON_TYPES, type PokemonTypeName } from "@/types/pokemon";
import { pick, shuffle, type Rng } from "./rng";
import { fitsBudget } from "./team";

export type Tier = "weak" | "mid" | "strong";

/** Splits the pool into thirds by base stat total. */
export function tierThresholds(pool: readonly BattlePokemon[]): [number, number] {
  const sorted = pool.map((p) => p.bst).sort((a, b) => a - b);
  const at = (fraction: number) => sorted[Math.floor(sorted.length * fraction)] ?? 0;
  return [at(1 / 3), at(2 / 3)];
}

export function tierOf(pokemon: BattlePokemon, [low, high]: [number, number]): Tier {
  if (pokemon.bst < low) return "weak";
  return pokemon.bst < high ? "mid" : "strong";
}

export interface DraftRound {
  /** The die face: offers come from this type (topped up from others when it runs short). */
  type: PokemonTypeName;
  offers: BattlePokemon[];
  /** Offers that would break the budget: shown, but can't be picked. */
  blocked: string[];
}

/**
 * One draft round, in the spirit of 7a0's die: roll a type, then offer one weak, one mid and one
 * strong Pokémon of that type. Offers ignore the budget on purpose, so the player *sees* what the
 * cap costs: the ones that don't fit come back in `blocked`. At least one offer always fits, and
 * offers never repeat a family already on the team (or each other).
 */
export function draftRound(
  pool: readonly BattlePokemon[],
  team: readonly BattlePokemon[],
  rng: Rng,
  budget = TEAM_BUDGET,
): DraftRound {
  const teamFamilies = new Set(team.map((p) => p.family));
  const available = pool.filter((p) => !teamFamilies.has(p.family));
  const fits = (p: BattlePokemon) => fitsBudget(p, team, pool, budget);
  // Only types with at least one affordable Pokémon can come up, so a round is never a dead end.
  const types = POKEMON_TYPES.filter((type) =>
    available.some((p) => p.types.includes(type) && fits(p)),
  );
  const type = pick(rng, types) ?? "normal";
  const thresholds = tierThresholds(pool);

  const offers: BattlePokemon[] = [];
  const families = new Set<number>();
  const add = (pokemon: BattlePokemon | undefined) => {
    if (!pokemon || families.has(pokemon.family) || offers.length >= OFFERS_PER_ROUND) return;
    offers.push(pokemon);
    families.add(pokemon.family);
  };

  const ofType = shuffle(
    rng,
    available.filter((p) => p.types.includes(type)),
  );
  for (const tier of ["weak", "mid", "strong"] as const) {
    add(ofType.find((p) => tierOf(p, thresholds) === tier && !families.has(p.family)));
  }
  for (const pokemon of ofType) add(pokemon);
  for (const pokemon of shuffle(rng, available)) add(pokemon);

  // Guarantee a legal pick: bring in an affordable Pokémon of the rolled type, dropping any offer
  // of its family (Weedle replaces Beedrill) or else the weakest one.
  let final = offers;
  if (!offers.some(fits)) {
    const replacement = ofType.find(fits) ?? available.find(fits);
    if (replacement) {
      const others = offers
        .filter((p) => p.family !== replacement.family)
        .sort((a, b) => b.bst - a.bst)
        .slice(0, OFFERS_PER_ROUND - 1);
      final = [replacement, ...others];
    }
  }

  return {
    type,
    offers: final.sort((a, b) => a.bst - b.bst || a.id - b.id),
    blocked: final.filter((p) => !fits(p)).map((p) => p.name),
  };
}
