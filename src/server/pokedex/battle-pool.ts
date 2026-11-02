import { z } from "zod";
import { CACHE_TTL_SECONDS } from "@/config/pokedex";
import { LAST_SPECIES_ID_BY_GENERATION, POOL_GENERATIONS, TEAM_SIZE } from "@/config/gym";
import { POKEMON_TYPES, STAT_NAMES, type StatName } from "@/types/pokemon";
import type { BattlePokemon } from "@/types/battle";
import { isPokemonType } from "../pokeapi/mappers";
import snapshot from "./data/battle-pool.json";

/**
 * The REST index has no stats or evolution families, and fetching them per Pokémon would cost
 * hundreds of heavy requests. PokeAPI's GraphQL endpoint returns the whole pool in one ~74 KB
 * response (project-goal.md §8.8). A recorded snapshot is the fallback and the test fixture.
 */
export const DEFAULT_GRAPHQL_URL = "https://beta.pokeapi.co/graphql/v1beta";

export const POOL_QUERY = `query BattlePool($maxId: Int!) {
  pokemon_v2_pokemonspecies(
    where: { id: { _lte: $maxId }, is_legendary: { _eq: false }, is_mythical: { _eq: false } }
    order_by: { id: asc }
  ) {
    id
    name
    evolution_chain_id
    is_baby
    pokemon_v2_pokemons(where: { is_default: { _eq: true } }) {
      id
      pokemon_v2_pokemonstats { base_stat pokemon_v2_stat { name } }
      pokemon_v2_pokemontypes { slot pokemon_v2_type { name } }
    }
  }
}`;

export const poolResponseSchema = z.object({
  data: z.object({
    pokemon_v2_pokemonspecies: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        evolution_chain_id: z.number(),
        is_baby: z.boolean(),
        pokemon_v2_pokemons: z.array(
          z.object({
            id: z.number(),
            pokemon_v2_pokemonstats: z.array(
              z.object({
                base_stat: z.number(),
                pokemon_v2_stat: z.object({ name: z.string() }),
              }),
            ),
            pokemon_v2_pokemontypes: z.array(
              z.object({ slot: z.number(), pokemon_v2_type: z.object({ name: z.string() }) }),
            ),
          }),
        ),
      }),
    ),
  }),
});

const typeName = z.enum(POKEMON_TYPES);

const battlePokemonSchema: z.ZodType<BattlePokemon> = z.object({
  id: z.number(),
  name: z.string(),
  family: z.number(),
  baby: z.boolean(),
  types: z.union([z.tuple([typeName]), z.tuple([typeName, typeName])]),
  stats: z.object({
    hp: z.number(),
    attack: z.number(),
    defense: z.number(),
    "special-attack": z.number(),
    "special-defense": z.number(),
    speed: z.number(),
  }),
  bst: z.number(),
});

/** A pool must at least fill two full teams. */
export const battlePoolSchema = z.array(battlePokemonSchema).min(TEAM_SIZE * 2);

export function poolMaxSpeciesId(generations: readonly number[] = POOL_GENERATIONS): number {
  const last = Math.max(...generations);
  return LAST_SPECIES_ID_BY_GENERATION[last - 1] ?? 151;
}

export function mapPoolResponse(response: z.infer<typeof poolResponseSchema>): BattlePokemon[] {
  return response.data.pokemon_v2_pokemonspecies.flatMap((species) => {
    const pokemon = species.pokemon_v2_pokemons[0];
    if (!pokemon) return [];
    const types = [...pokemon.pokemon_v2_pokemontypes]
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.pokemon_v2_type.name)
      .filter(isPokemonType);
    const [first, second] = types;
    if (!first) return [];
    const stats = {} as Record<StatName, number>;
    for (const name of STAT_NAMES) {
      const stat = pokemon.pokemon_v2_pokemonstats.find((s) => s.pokemon_v2_stat.name === name);
      if (!stat) return [];
      stats[name] = stat.base_stat;
    }
    return [
      {
        id: pokemon.id,
        name: species.name,
        family: species.evolution_chain_id,
        baby: species.is_baby,
        types: second ? [first, second] : [first],
        stats,
        bst: STAT_NAMES.reduce((sum, name) => sum + stats[name], 0),
      },
    ];
  });
}

export async function fetchBattlePool(
  options: { endpoint?: string; fetch?: typeof fetch; timeoutMs?: number } = {},
): Promise<BattlePokemon[]> {
  const doFetch = options.fetch ?? fetch;
  const response = await doFetch(
    options.endpoint ?? process.env.POKEAPI_GRAPHQL_URL ?? DEFAULT_GRAPHQL_URL,
    {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query: POOL_QUERY, variables: { maxId: poolMaxSpeciesId() } }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
    },
  );
  if (!response.ok) throw new Error(`GraphQL responded ${response.status}`);
  const parsed = poolResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error(`Unexpected GraphQL shape: ${parsed.error.message}`);
  return mapPoolResponse(parsed.data);
}

/** The recorded pool (see `yarn battle-pool:record`). */
export function snapshotPool(): BattlePokemon[] {
  return battlePoolSchema.parse(snapshot);
}

/** Memoized loader: GraphQL first, snapshot if it fails. Never throws. */
export function createBattlePoolLoader(load: () => Promise<BattlePokemon[]> = fetchBattlePool) {
  let cached: { promise: Promise<BattlePokemon[]>; expiresAt: number } | undefined;
  return () => {
    const now = Date.now();
    if (!cached || cached.expiresAt <= now) {
      cached = {
        promise: load()
          .then((pool) => battlePoolSchema.parse(pool))
          .catch((error: unknown) => {
            console.error(`Battle pool: using snapshot (${(error as Error).message})`);
            cached = { promise: Promise.resolve(snapshotPool()), expiresAt: now + 5 * 60_000 };
            return snapshotPool();
          }),
        expiresAt: now + CACHE_TTL_SECONDS * 1000,
      };
    }
    return cached.promise;
  };
}
