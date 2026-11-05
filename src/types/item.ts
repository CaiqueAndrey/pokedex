/** A PokeAPI item, reduced to what the gym rewards need. */
export interface GameItem {
  name: string;
  /** Official sprite URL (PokeAPI sprites repository), when there is one. */
  sprite: string | null;
  /** PokeAPI item category, e.g. "evolution" or "loot". */
  category: string;
}
