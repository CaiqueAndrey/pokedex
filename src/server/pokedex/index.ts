import { idFromUrl } from "@/lib/format";
import { POKEMON_TYPES, type PokemonSummary, type PokemonTypeName } from "@/types/pokemon";
import type { PokeApiClient } from "../pokeapi/client";
import {
  findSpeciesName,
  formFromName,
  generationFromName,
  isExcludedForm,
  isPokemonType,
} from "../pokeapi/mappers";
import { generationSchema, resourceListSchema, typeSchema } from "../pokeapi/schemas";
import { parseResource } from "./parse";

const FIRST_FORM_ID = 10000;
const GENERATION_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Builds the light-weight Pokédex index (~30 cached requests) so search, filters and
 * pagination can be plain functions instead of one request per Pokémon.
 */
export async function buildIndex(client: PokeApiClient): Promise<PokemonSummary[]> {
  const [speciesList, pokemonList, typeResponses, generationResponses] = await Promise.all([
    parseResource(client, "/pokemon-species?limit=2000", resourceListSchema),
    parseResource(client, "/pokemon?limit=3000", resourceListSchema),
    Promise.all(POKEMON_TYPES.map((name) => parseResource(client, `/type/${name}`, typeSchema))),
    Promise.all(
      GENERATION_IDS.map((id) => parseResource(client, `/generation/${id}`, generationSchema)),
    ),
  ]);
  if (!speciesList || !pokemonList) throw new Error("Pokédex index sources are unavailable");

  const speciesById = new Map<number, string>();
  const speciesIdByName = new Map<string, number>();
  for (const species of speciesList.results) {
    const id = idFromUrl(species.url);
    speciesById.set(id, species.name);
    speciesIdByName.set(species.name, id);
  }
  const speciesNames = [...speciesById.values()];

  const typesByPokemon = new Map<string, { slot: number; type: PokemonTypeName }[]>();
  for (const response of typeResponses) {
    if (!response || !isPokemonType(response.name)) continue;
    for (const entry of response.pokemon) {
      const list = typesByPokemon.get(entry.pokemon.name) ?? [];
      list.push({ slot: entry.slot, type: response.name });
      typesByPokemon.set(entry.pokemon.name, list);
    }
  }

  const generationBySpecies = new Map<string, number>();
  for (const response of generationResponses) {
    if (!response) continue;
    const generation = generationFromName(response.name);
    for (const species of response.pokemon_species) {
      generationBySpecies.set(species.name, generation);
    }
  }

  const summaries: PokemonSummary[] = [];
  for (const entry of pokemonList.results) {
    const id = idFromUrl(entry.url);
    const isDefault = id < FIRST_FORM_ID;
    const speciesName = isDefault
      ? speciesById.get(id)
      : isExcludedForm(entry.name)
        ? undefined
        : findSpeciesName(entry.name, speciesNames);
    if (!speciesName) continue;

    const speciesId = speciesIdByName.get(speciesName);
    const typeEntries = typesByPokemon.get(entry.name);
    const generation = generationBySpecies.get(speciesName);
    if (!speciesId || !typeEntries || !generation) continue;

    const [first, second] = [...typeEntries].sort((a, b) => a.slot - b.slot).map((t) => t.type);
    if (!first) continue;

    summaries.push({
      id,
      speciesId,
      name: entry.name,
      speciesName,
      isDefault,
      form: isDefault ? undefined : formFromName(entry.name, speciesName),
      types: second ? [first, second] : [first],
      generation,
    });
  }

  return summaries.sort((a, b) => a.speciesId - b.speciesId || a.id - b.id);
}
