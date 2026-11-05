import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { TYPE_LABELS, generationLabel } from "@/config/messages";
import { displayName, formatNumber } from "@/lib/format";
import { POKEMON_TYPES, type PokemonDetail, type PokemonTypeName } from "@/types/pokemon";

/**
 * Tool results are read by a model: every token counts. Text is compact, one fact per line, and
 * types carry the slug (what the tools accept) plus the Portuguese label the app shows.
 */

export const pokemonTypeSchema = z.enum(POKEMON_TYPES);

export const typeRefSchema = z.object({ slug: pokemonTypeSchema, label: z.string() });
export type TypeRef = z.infer<typeof typeRefSchema>;

export const typeRef = (slug: PokemonTypeName): TypeRef => ({ slug, label: TYPE_LABELS[slug] });

/** "fire (Fogo)" */
export const typeText = (slug: PokemonTypeName) => `${slug} (${TYPE_LABELS[slug]})`;

/** "fire (Fogo), flying (Voador)", or "—" for an empty list. */
export const typeList = (types: readonly PokemonTypeName[]) =>
  types.length ? types.map(typeText).join(", ") : "—";

/** "#0006 charizard — Charizard — fire (Fogo) / flying (Voador)" */
export function pokemonLine(pokemon: {
  speciesId: number;
  name: string;
  speciesName: string;
  form?: { label: string };
  types: readonly PokemonTypeName[];
}): string {
  return `${formatNumber(pokemon.speciesId)} ${pokemon.name} — ${displayName(pokemon)} — ${pokemon.types.map(typeText).join(" / ")}`;
}

export const statTotal = (detail: PokemonDetail) =>
  detail.stats.reduce((sum, stat) => sum + stat.base, 0);

/** The full Pokémon card, shared by `get_pokemon` and the `pokemon://{name}` resource. */
export function pokemonText(detail: PokemonDetail): string {
  const forms = detail.varieties.filter((v) => v.name !== detail.name);
  const lines = [
    pokemonLine(detail),
    `${detail.genus} · generation ${detail.generation} (${generationLabel(detail.generation)}) · ${detail.heightM} m · ${detail.weightKg} kg`,
    `Base stats: ${detail.stats.map((s) => `${s.name} ${s.base}`).join(", ")} (total ${statTotal(detail)})`,
    `Abilities: ${detail.abilities.map((a) => (a.hidden ? `${a.name} (hidden)` : a.name)).join(", ")}`,
  ];
  if (forms.length) {
    lines.push(`Other forms: ${forms.map((f) => `${f.name} (${f.label})`).join(", ")}`);
  }
  if (detail.flavorText) lines.push(`Pokédex entry: ${detail.flavorText}`);
  return lines.join("\n");
}

export function toolResult<T extends Record<string, unknown>>(
  text: string,
  structuredContent: T,
): CallToolResult {
  return { content: [{ type: "text", text }], structuredContent };
}

/** An error the model can act on (fix the name, change the input): a result, not an exception. */
export function toolError(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}
