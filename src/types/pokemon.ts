export const POKEMON_TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const;

export type PokemonTypeName = (typeof POKEMON_TYPES)[number];

export const STAT_NAMES = [
  "hp",
  "attack",
  "defense",
  "special-attack",
  "special-defense",
  "speed",
] as const;

export type StatName = (typeof STAT_NAMES)[number];

export type FormCategory = "regional" | "mega" | "gmax" | "other";

export interface PokemonForm {
  category: FormCategory;
  label: string;
}

export interface PokemonSummary {
  /** Variety id (>= 10001 for alternative forms). */
  id: number;
  /** National Pokédex number — what the UI shows. */
  speciesId: number;
  /** API slug: "mr-mime", "raichu-alola". */
  name: string;
  /** Slug of the species this variety belongs to ("raichu" for "raichu-alola"). */
  speciesName: string;
  isDefault: boolean;
  form?: PokemonForm;
  types: [PokemonTypeName] | [PokemonTypeName, PokemonTypeName];
  generation: number;
}

export interface PokemonVariety {
  name: string;
  label: string;
  isDefault: boolean;
}

export interface PokemonDetail extends PokemonSummary {
  varieties: PokemonVariety[];
  heightM: number;
  weightKg: number;
  stats: { name: StatName; base: number }[];
  abilities: { name: string; hidden: boolean }[];
  artwork: { default: string; shiny: string };
  cry?: string;
  genus: string;
  flavorText: string;
  evolutionChainId: number;
}

export interface EvolutionNode {
  id: number;
  name: string;
  trigger?: string;
  evolvesTo: EvolutionNode[];
}

/** Damage multipliers an attacking type deals, keyed by defending type. */
export type TypeRelations = Record<PokemonTypeName, Partial<Record<PokemonTypeName, number>>>;
