/**
 * Records a small, schema-stripped slice of the real PokeAPI into
 * src/server/pokeapi/fixtures/pokeapi.json. Run manually: `yarn fixtures:record`.
 * Tests and E2E read this file; they never call the real API.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { idFromUrl } from "../src/lib/format";
import { REWARD_ITEM_NAMES } from "../src/config/gym";
import {
  evolutionChainSchema,
  generationSchema,
  itemSchema,
  pokemonSchema,
  speciesSchema,
  typeSchema,
} from "../src/server/pokeapi/schemas";
import { POKEMON_TYPES } from "../src/types/pokemon";

const BASE = "https://pokeapi.co/api/v2";
const SPECIES_IDS = [
  ...Array.from({ length: 48 }, (_, i) => i + 1),
  92,
  93,
  94,
  133,
  134,
  135,
  136,
  196,
  197,
  227,
  152,
  252,
  470,
  471,
  700,
];
const EXTRA_VARIETIES = [
  "raichu-alola",
  "charizard-mega-x",
  "charizard-mega-y",
  "charizard-gmax",
  "pikachu-gmax",
  "gengar-mega",
  "pikachu-cosplay",
];

async function get(urlPath: string): Promise<unknown> {
  const response = await fetch(`${BASE}${urlPath}`);
  if (!response.ok) throw new Error(`${response.status} ${urlPath}`);
  return response.json();
}

const out: Record<string, unknown> = {};
const speciesEntries: { name: string; url: string }[] = [];
const pokemonEntries: { name: string; url: string }[] = [];
const pokemonNames = new Set<string>();
const speciesNames = new Set<string>();
const chains = new Set<number>();

async function recordPokemon(name: string) {
  const pokemon = pokemonSchema.parse(await get(`/pokemon/${name}`));
  out[`/pokemon/${pokemon.name}`] = pokemon;
  out[`/pokemon/${pokemon.id}`] = pokemon;
  pokemonNames.add(pokemon.name);
  pokemonEntries.push({ name: pokemon.name, url: `${BASE}/pokemon/${pokemon.id}/` });
}

async function main() {
  for (const id of SPECIES_IDS) {
    const full = speciesSchema.parse(await get(`/pokemon-species/${id}`));
    const species = {
      ...full,
      genera: full.genera.filter((g) => g.language.name === "en"),
      flavor_text_entries: full.flavor_text_entries
        .filter((f) => f.language.name === "en")
        .slice(-1),
    };
    out[`/pokemon-species/${species.name}`] = species;
    out[`/pokemon-species/${species.id}`] = species;
    speciesNames.add(species.name);
    speciesEntries.push({ name: species.name, url: `${BASE}/pokemon-species/${species.id}/` });
    if (species.evolution_chain) chains.add(idFromUrl(species.evolution_chain.url));
    const defaultVariety = species.varieties.find((v) => v.is_default);
    if (defaultVariety) await recordPokemon(defaultVariety.pokemon.name);
  }
  for (const name of EXTRA_VARIETIES) await recordPokemon(name);

  for (const id of chains) {
    out[`/evolution-chain/${id}`] = evolutionChainSchema.parse(await get(`/evolution-chain/${id}`));
  }
  for (const type of POKEMON_TYPES) {
    const full = typeSchema.parse(await get(`/type/${type}`));
    out[`/type/${type}`] = {
      ...full,
      pokemon: full.pokemon.filter((p) => pokemonNames.has(p.pokemon.name)),
    };
  }
  for (let id = 1; id <= 9; id++) {
    const full = generationSchema.parse(await get(`/generation/${id}`));
    out[`/generation/${id}`] = {
      ...full,
      pokemon_species: full.pokemon_species.filter((s) => speciesNames.has(s.name)),
    };
  }
  for (const name of REWARD_ITEM_NAMES) {
    out[`/item/${name}`] = itemSchema.parse(await get(`/item/${name}`));
  }
  out["/pokemon-species"] = { count: speciesEntries.length, results: speciesEntries };
  out["/pokemon"] = { count: pokemonEntries.length, results: pokemonEntries };

  writeFileSync(path.join("src/server/pokeapi/fixtures/pokeapi.json"), JSON.stringify(out));
  console.error(`Recorded ${Object.keys(out).length} resources.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
