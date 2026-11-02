import { POKEMON_TYPES, type PokemonTypeName, type TypeRelations } from "@/types/pokemon";

export type Matchups = Record<PokemonTypeName, number>;

/** Damage multiplier each attacking type deals to a Pokémon with the given defending types. */
export function computeMatchups(
  defending: readonly PokemonTypeName[],
  relations: TypeRelations,
): Matchups {
  const result = {} as Matchups;
  for (const attacker of POKEMON_TYPES) {
    result[attacker] = defending.reduce(
      (multiplier, defender) => multiplier * (relations[attacker][defender] ?? 1),
      1,
    );
  }
  return result;
}

export interface MatchupGroups {
  weak4: PokemonTypeName[];
  weak2: PokemonTypeName[];
  /** ½× */
  resist: PokemonTypeName[];
  /** ¼× */
  resist4: PokemonTypeName[];
  immune: PokemonTypeName[];
}

export function groupMatchups(matchups: Matchups): MatchupGroups {
  const pick = (predicate: (value: number) => boolean) =>
    POKEMON_TYPES.filter((type) => predicate(matchups[type]));
  return {
    weak4: pick((v) => v >= 4),
    weak2: pick((v) => v === 2),
    resist: pick((v) => v === 0.5),
    resist4: pick((v) => v > 0 && v <= 0.25),
    immune: pick((v) => v === 0),
  };
}

export interface TeamCoverageRow {
  type: PokemonTypeName;
  weak: number;
  /** Members that take reduced damage, immunities included. */
  resist: number;
  immune: number;
}

/** For each attacking type: how many team members are weak / resistant to it. */
export function teamCoverage(
  members: readonly (readonly PokemonTypeName[])[],
  relations: TypeRelations,
): TeamCoverageRow[] {
  const all = members.map((types) => computeMatchups(types, relations));
  return POKEMON_TYPES.map((type) => ({
    type,
    weak: all.filter((m) => m[type] > 1).length,
    resist: all.filter((m) => m[type] < 1).length,
    immune: all.filter((m) => m[type] === 0).length,
  }));
}

/** Types that `threshold` or more members are weak to. */
export function sharedWeaknesses(rows: TeamCoverageRow[], threshold = 3): PokemonTypeName[] {
  return rows.filter((row) => row.weak >= threshold).map((row) => row.type);
}
