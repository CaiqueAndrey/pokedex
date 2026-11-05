import { CACHE_TTL_SECONDS } from "@/config/pokedex";
import type { GameItem } from "@/types/item";
import {
  POKEMON_TYPES,
  type EvolutionNode,
  type PokemonDetail,
  type PokemonSummary,
  type TypeRelations,
} from "@/types/pokemon";
import { createPokeApiClient, type PokeApiClient } from "../pokeapi/client";
import { mapEvolutionChain, mapItem, mapPokemonDetail, mapTypeRelations } from "../pokeapi/mappers";
import {
  evolutionChainSchema,
  itemSchema,
  pokemonSchema,
  speciesSchema,
  typeSchema,
} from "../pokeapi/schemas";
import { buildIndex } from "./index";
import { parseResource } from "./parse";

export interface PokedexService {
  /** Every species (and alternative form), sorted by Pokédex number. */
  listPokemon(): Promise<PokemonSummary[]>;
  /** `null` when the Pokémon does not exist. Accepts a slug, a species slug or a number. */
  getPokemonDetail(name: string): Promise<PokemonDetail | null>;
  getEvolutionChain(chainId: number): Promise<EvolutionNode | null>;
  getTypeRelations(): Promise<TypeRelations>;
  /** Items by name (sprite, category); unknown names are skipped. */
  getItems(names: readonly string[]): Promise<GameItem[]>;
}

export function createPokedexService(
  client: PokeApiClient = createPokeApiClient(),
): PokedexService {
  let index: { promise: Promise<PokemonSummary[]>; expiresAt: number } | undefined;
  let relations: Promise<TypeRelations> | undefined;

  return {
    listPokemon() {
      const now = Date.now();
      if (!index || index.expiresAt <= now) {
        const entry = {
          promise: buildIndex(client),
          expiresAt: now + CACHE_TTL_SECONDS * 1000,
        };
        index = entry;
        // Never memoize a failure.
        entry.promise.catch(() => {
          if (index === entry) index = undefined;
        });
      }
      return index.promise;
    },

    async getPokemonDetail(name) {
      const slug = encodeURIComponent(name.toLowerCase());
      let pokemon = await parseResource(client, `/pokemon/${slug}`, pokemonSchema);
      if (!pokemon) {
        // Maybe a species slug whose default variety has another name (deoxys → deoxys-normal).
        const bySpecies = await parseResource(client, `/pokemon-species/${slug}`, speciesSchema);
        const variety = bySpecies?.varieties.find((v) => v.is_default);
        if (!variety) return null;
        pokemon = await parseResource(client, `/pokemon/${variety.pokemon.name}`, pokemonSchema);
        if (!pokemon) return null;
      }
      const species = await parseResource(
        client,
        `/pokemon-species/${pokemon.species.name}`,
        speciesSchema,
      );
      if (!species) return null;
      return mapPokemonDetail(pokemon, species) ?? null;
    },

    async getEvolutionChain(chainId) {
      const response = await parseResource(
        client,
        `/evolution-chain/${chainId}`,
        evolutionChainSchema,
      );
      return response ? mapEvolutionChain(response) : null;
    },

    getTypeRelations() {
      relations ??= (async () => {
        const responses = await Promise.all(
          POKEMON_TYPES.map((name) => parseResource(client, `/type/${name}`, typeSchema)),
        );
        const result = {} as TypeRelations;
        POKEMON_TYPES.forEach((name, i) => {
          const response = responses[i];
          if (!response) throw new Error(`Type ${name} not found`);
          result[name] = mapTypeRelations(response);
        });
        return result;
      })().catch((error: unknown) => {
        relations = undefined;
        throw error;
      });
      return relations;
    },

    async getItems(names) {
      const responses = await Promise.all(
        names.map((name) => parseResource(client, `/item/${encodeURIComponent(name)}`, itemSchema)),
      );
      return responses.flatMap((response) => (response ? [mapItem(response)] : []));
    },
  };
}
