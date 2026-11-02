export const PAGE_SIZE = 24;
export const GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export const TOTAL_SPECIES_FALLBACK = 1025;

/** Pokédex data barely changes (only with new games), so cache for a day. */
export const CACHE_TTL_SECONDS = 60 * 60 * 24;

export const DEFAULT_POKEAPI_BASE_URL = "https://pokeapi.co/api/v2";
export const SPRITES_BASE_URL =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
