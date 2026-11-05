import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { displayName } from "@/lib/format";
import { STAT_NAMES } from "@/types/pokemon";
import { resolvePokemon, type McpDeps } from "../context";
import { pokemonText, statTotal, toolError, toolResult, typeRef, typeRefSchema } from "../format";

export const nameSchema = z
  .string()
  .min(1)
  .max(60)
  .describe('A slug ("mr-mime", "charizard-mega-x"), a name ("Mr. Mime") or a number ("25").');

const outputSchema = {
  number: z.number(),
  name: z.string(),
  displayName: z.string(),
  species: z.string(),
  types: z.array(typeRefSchema),
  generation: z.number(),
  genus: z.string(),
  heightM: z.number(),
  weightKg: z.number(),
  stats: z.record(z.enum(STAT_NAMES), z.number()),
  statTotal: z.number(),
  abilities: z.array(z.object({ name: z.string(), hidden: z.boolean() })),
  forms: z.array(z.object({ name: z.string(), label: z.string() })),
  flavorText: z.string(),
};

export function registerGetPokemon(server: McpServer, { pokedex }: McpDeps) {
  server.registerTool(
    "get_pokemon",
    {
      title: "Get Pokémon details",
      description:
        "Full details of one Pokémon or form: types, base stats, abilities, height/weight, " +
        "other forms and its Pokédex entry. Accepts alternative forms (raichu-alola, " +
        "charizard-mega-x). Unknown names return an error with suggestions.",
      inputSchema: { name: nameSchema },
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ name }) => {
      const resolved = await resolvePokemon(pokedex, [name]);
      if (!resolved.ok) return toolError(resolved.message);
      const [detail] = resolved.details;
      if (!detail) return toolError(`Pokémon "${name}" not found.`);
      return toolResult(pokemonText(detail), {
        number: detail.speciesId,
        name: detail.name,
        displayName: displayName(detail),
        species: detail.speciesName,
        types: detail.types.map(typeRef),
        generation: detail.generation,
        genus: detail.genus,
        heightM: detail.heightM,
        weightKg: detail.weightKg,
        stats: Object.fromEntries(detail.stats.map((s) => [s.name, s.base])),
        statTotal: statTotal(detail),
        abilities: detail.abilities,
        forms: detail.varieties
          .filter((v) => v.name !== detail.name)
          .map((v) => ({ name: v.name, label: v.label })),
        flavorText: detail.flavorText,
      });
    },
  );
}
