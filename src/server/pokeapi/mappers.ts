import {
  cleanFlavorText,
  decimetresToMetres,
  formatName,
  hectogramsToKg,
  idFromUrl,
  romanToNumber,
} from "@/lib/format";
import { spriteUrl } from "@/lib/sprites";
import {
  POKEMON_TYPES,
  STAT_NAMES,
  type EvolutionNode,
  type FormCategory,
  type PokemonDetail,
  type PokemonForm,
  type PokemonSummary,
  type PokemonTypeName,
  type PokemonVariety,
  type StatName,
} from "@/types/pokemon";
import type { GameItem } from "@/types/item";
import type {
  ChainLink,
  EvolutionChainResponse,
  ItemResponse,
  PokemonResponse,
  SpeciesResponse,
  TypeResponse,
} from "./schemas";

export function isPokemonType(name: string): name is PokemonTypeName {
  return (POKEMON_TYPES as readonly string[]).includes(name);
}

function isStatName(name: string): name is StatName {
  return (STAT_NAMES as readonly string[]).includes(name);
}

// ---------------------------------------------------------------- forms

const REGIONS = ["alola", "galar", "hisui", "paldea"];
/** Cosmetic or battle-only varieties: they change neither type nor stats in a way we show. */
const EXCLUDED_FORM = /(^|-)(cap|cosplay|starter|rock-star|belle|pop-star|phd|libre|totem)(-|$)/;

export function classifyForm(suffix: string): PokemonForm {
  const parts = suffix.split("-");
  let category: FormCategory = "other";
  if (parts.includes("mega")) category = "mega";
  else if (parts.includes("gmax")) category = "gmax";
  else if (REGIONS.includes(parts[0] ?? "")) category = "regional";
  const label = parts.map((part) => (part === "gmax" ? "Gigantamax" : formatName(part))).join(" ");
  return { category, label };
}

export function isExcludedForm(name: string): boolean {
  return EXCLUDED_FORM.test(name);
}

/** Longest species slug that prefixes this variety slug ("raichu-alola" → "raichu"). */
export function findSpeciesName(
  varietyName: string,
  speciesNames: Iterable<string>,
): string | undefined {
  let best: string | undefined;
  for (const species of speciesNames) {
    if (varietyName === species || varietyName.startsWith(`${species}-`)) {
      if (!best || species.length > best.length) best = species;
    }
  }
  return best;
}

export function formFromName(varietyName: string, speciesName: string): PokemonForm | undefined {
  if (varietyName === speciesName) return undefined;
  return classifyForm(varietyName.slice(speciesName.length + 1));
}

// ------------------------------------------------------------- pokemon

export function generationFromName(name: string): number {
  return romanToNumber(name.replace("generation-", ""));
}

export function mapTypes(types: PokemonResponse["types"]): PokemonSummary["types"] | undefined {
  const sorted = [...types]
    .sort((a, b) => a.slot - b.slot)
    .map((t) => t.type.name)
    .filter(isPokemonType);
  const [first, second] = sorted;
  if (!first) return undefined;
  return second ? [first, second] : [first];
}

function pickText<T extends { language: { name: string } }>(entries: T[]): T | undefined {
  // The API has no pt-BR for these fields (see docs/phases/01-pokeapi-layer.md): fall back to English.
  return (
    entries.find((entry) => entry.language.name === "pt-BR") ??
    entries.find((entry) => entry.language.name === "en")
  );
}

export function mapPokemonDetail(
  pokemon: PokemonResponse,
  species: SpeciesResponse,
): PokemonDetail | undefined {
  const types = mapTypes(pokemon.types);
  if (!types || !species.evolution_chain) return undefined;

  const artwork = pokemon.sprites.other?.["official-artwork"];
  const defaultArt =
    artwork?.front_default ?? pokemon.sprites.front_default ?? spriteUrl(pokemon.id, "default");
  const shinyArt = artwork?.front_shiny ?? pokemon.sprites.front_shiny ?? defaultArt;

  const varieties: PokemonVariety[] = species.varieties
    .filter((variety) => variety.is_default || !isExcludedForm(variety.pokemon.name))
    .map((variety) => ({
      name: variety.pokemon.name,
      isDefault: variety.is_default,
      label: variety.is_default
        ? "Normal"
        : (formFromName(variety.pokemon.name, species.name)?.label ??
          formatName(variety.pokemon.name)),
    }));

  const stats = pokemon.stats
    .filter((stat) => isStatName(stat.stat.name))
    .map((stat) => ({ name: stat.stat.name as StatName, base: stat.base_stat }));

  return {
    id: pokemon.id,
    speciesId: species.id,
    name: pokemon.name,
    speciesName: species.name,
    isDefault: pokemon.is_default,
    form: formFromName(pokemon.name, species.name),
    types,
    generation: generationFromName(species.generation.name),
    varieties,
    heightM: decimetresToMetres(pokemon.height),
    weightKg: hectogramsToKg(pokemon.weight),
    stats,
    abilities: pokemon.abilities.map((a) => ({ name: a.ability.name, hidden: a.is_hidden })),
    artwork: { default: defaultArt, shiny: shinyArt },
    cry: pokemon.cries?.latest ?? undefined,
    genus: pickText(species.genera)?.genus ?? "",
    flavorText: cleanFlavorText(pickText(species.flavor_text_entries)?.flavor_text ?? ""),
    evolutionChainId: idFromUrl(species.evolution_chain.url),
  };
}

// ------------------------------------------------------------ evolution

export function describeTrigger(details: ChainLink["evolution_details"]): string | undefined {
  const detail = details[0];
  if (!detail) return undefined;
  const parts: string[] = [];
  if (detail.trigger.name === "trade") parts.push("Troca");
  else if (detail.trigger.name === "use-item" && detail.item)
    parts.push(formatName(detail.item.name));
  else if (detail.min_level) parts.push(`Nível ${detail.min_level}`);
  else if (detail.min_happiness) parts.push(`Amizade ${detail.min_happiness}`);
  else if (detail.trigger.name === "level-up") parts.push("Subir de nível");
  else parts.push(formatName(detail.trigger.name));
  if (detail.held_item) parts.push(`segurando ${formatName(detail.held_item.name)}`);
  if (detail.known_move) parts.push(`com ${formatName(detail.known_move.name)}`);
  if (detail.time_of_day) parts.push(detail.time_of_day === "day" ? "de dia" : "de noite");
  if (detail.location) parts.push(`em ${formatName(detail.location.name)}`);
  return parts.join(" · ");
}

export function mapEvolutionChain(response: EvolutionChainResponse): EvolutionNode {
  const mapLink = (link: ChainLink): EvolutionNode => ({
    id: idFromUrl(link.species.url),
    name: link.species.name,
    trigger: describeTrigger(link.evolution_details),
    evolvesTo: link.evolves_to.map(mapLink),
  });
  return mapLink(response.chain);
}

// ----------------------------------------------------------------- type

/** Damage multipliers this type deals; types absent from the result are neutral (1×). */
export function mapTypeRelations(response: TypeResponse): Partial<Record<PokemonTypeName, number>> {
  const result: Partial<Record<PokemonTypeName, number>> = {};
  const apply = (names: { name: string }[], multiplier: number) => {
    for (const { name } of names) if (isPokemonType(name)) result[name] = multiplier;
  };
  apply(response.damage_relations.double_damage_to, 2);
  apply(response.damage_relations.half_damage_to, 0.5);
  apply(response.damage_relations.no_damage_to, 0);
  return result;
}

/** An item as the game shows it: the official sprite and its category. */
export function mapItem(response: ItemResponse): GameItem {
  return {
    name: response.name,
    sprite: response.sprites.default,
    category: response.category.name,
  };
}
