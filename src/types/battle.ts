import type { PokemonTypeName, StatName } from "./pokemon";

/** A Pokémon as the gym game sees it: only what drafting and battling need. */
export interface BattlePokemon {
  id: number;
  name: string;
  /** Evolution chain id: one Pokémon per family per team. */
  family: number;
  baby: boolean;
  types: [PokemonTypeName] | [PokemonTypeName, PokemonTypeName];
  stats: Record<StatName, number>;
  /** Base stat total. */
  bst: number;
  /** Legendary: only joins a team through a Master Ball encounter. */
  legendary?: true;
}

export type Side = "player" | "opponent";

export type BattleEvent =
  | { kind: "send"; side: Side; index: number }
  | {
      kind: "attack";
      side: Side;
      attacker: number;
      defender: number;
      type: PokemonTypeName;
      damage: number;
      effectiveness: number;
      critical: boolean;
      struggle: boolean;
      hpLeft: number;
    }
  | { kind: "faint"; side: Side; index: number }
  | { kind: "end"; winner: Side };

export interface BattleResult {
  winner: Side;
  events: BattleEvent[];
  /** Max HP of each member, by side, in team order. */
  maxHp: Record<Side, number[]>;
}
