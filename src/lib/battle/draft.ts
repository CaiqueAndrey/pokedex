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
  /** A Master Ball encounter: the offers are legendaries instead of a die roll. */
  legendary?: boolean;
  offers: BattlePokemon[];
  /** Offers that would break the budget: shown, but can't be picked. */
  blocked: string[];
}

/**
 * The die only lands on "friendly" faces: types with at least `OFFERS_PER_ROUND` families still
 * available and at least one mid-or-strong Pokémon that fits, so a round always has real choices.
 * Among those it prefers types the team doesn't have yet, nudging every run towards a varied team
 * (water, fire, electric…) instead of several rolls of the same type.
 */
export function rollType(
  available: readonly BattlePokemon[],
  team: readonly BattlePokemon[],
  fits: (p: BattlePokemon) => boolean,
  thresholds: [number, number],
  rng: Rng,
): PokemonTypeName {
  const viable = POKEMON_TYPES.filter((type) => {
    const ofType = available.filter((p) => p.types.includes(type));
    return (
      new Set(ofType.map((p) => p.family)).size >= OFFERS_PER_ROUND &&
      ofType.some((p) => fits(p) && tierOf(p, thresholds) !== "weak")
    );
  });
  const covered = new Set(team.flatMap((p) => p.types));
  const fresh = viable.filter((type) => !covered.has(type));
  // Last resort (never expected with real pools): any type with something that fits.
  const anyFit = POKEMON_TYPES.filter((type) =>
    available.some((p) => p.types.includes(type) && fits(p)),
  );
  return pick(rng, fresh.length > 0 ? fresh : viable.length > 0 ? viable : anyFit) ?? "normal";
}

/**
 * One draft round, in the spirit of 7a0's die: roll a type, then offer one weak, one mid and one
 * strong Pokémon of that type. Offers never repeat a family already on the team (or each other).
 *
 * With a `budget` (hard mode) offers ignore it on purpose, so the player *sees* what the cap costs:
 * the ones that don't fit come back in `blocked`, and at least one always fits. With no budget
 * (`null`, easy mode) every offer can be picked: choose by taste and type.
 */
export function draftRound(
  pool: readonly BattlePokemon[],
  team: readonly BattlePokemon[],
  rng: Rng,
  budget: number | null = TEAM_BUDGET,
): DraftRound {
  const teamFamilies = new Set(team.map((p) => p.family));
  // Legendaries never come from the die: only from a Master Ball encounter.
  const regular = pool.filter((p) => !p.legendary);
  const available = regular.filter((p) => !teamFamilies.has(p.family));
  const affordable = new Set(
    budget === null ? available : available.filter((p) => fitsBudget(p, team, pool, budget)),
  );
  const fits = (p: BattlePokemon) => affordable.has(p);
  const thresholds = tierThresholds(regular);
  const type = rollType(available, team, fits, thresholds, rng);

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

/**
 * A Master Ball encounter (the first round of a legendary run): three different legendaries that
 * fit the budget, leaving room for the five slots after them.
 */
export function legendaryRound(
  pool: readonly BattlePokemon[],
  team: readonly BattlePokemon[],
  rng: Rng,
  budget: number | null = TEAM_BUDGET,
): DraftRound {
  const fits = (p: BattlePokemon) => budget === null || fitsBudget(p, team, pool, budget);
  const offers = shuffle(
    rng,
    pool.filter((p) => p.legendary && fits(p)),
  ).slice(0, OFFERS_PER_ROUND);
  const sorted = offers.sort((a, b) => a.bst - b.bst || a.id - b.id);
  return { type: sorted[0]?.types[0] ?? "normal", legendary: true, offers: sorted, blocked: [] };
}
