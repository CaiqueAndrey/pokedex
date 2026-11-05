import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GENERATIONS } from "@/config/pokedex";
import { filterPokemon, sortPokemon } from "@/lib/filters";
import { displayName } from "@/lib/format";
import type { McpDeps } from "../context";
import { pokemonLine, pokemonTypeSchema, toolResult, typeRef, typeRefSchema } from "../format";

export const SEARCH_LIMIT_MAX = 25;

const inputSchema = {
  query: z
    .string()
    .max(60)
    .optional()
    .describe('Part of the name ("char") or a Pokédex number ("25", "#025"). Omit to list all.'),
  types: z
    .array(pokemonTypeSchema)
    .max(2)
    .optional()
    .describe("Only Pokémon that have every one of these types (English slugs)."),
  generation: z
    .number()
    .int()
    .min(GENERATIONS[0])
    .max(GENERATIONS[GENERATIONS.length - 1] ?? 9)
    .optional()
    .describe("Only species introduced in this generation (1 = Kanto … 9 = Paldea)."),
  includeForms: z
    .boolean()
    .default(false)
    .describe("Also include alternative forms (regional, Mega, Gigantamax…)."),
  limit: z.number().int().min(1).max(SEARCH_LIMIT_MAX).default(10),
};

const resultSchema = z.object({
  number: z.number(),
  name: z.string(),
  displayName: z.string(),
  types: z.array(typeRefSchema),
  generation: z.number(),
});

const outputSchema = { total: z.number(), results: z.array(resultSchema) };

export function registerSearchPokemon(server: McpServer, { pokedex }: McpDeps) {
  server.registerTool(
    "search_pokemon",
    {
      title: "Search Pokémon",
      description:
        "Find Pokémon by name fragment or number, optionally filtered by type and generation. " +
        "Returns slugs, numbers and types sorted by Pokédex number, plus the total match count. " +
        "Use it to discover candidates or the exact slug before calling get_pokemon.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query, types, generation, includeForms, limit }) => {
      const all = await pokedex.listPokemon();
      const matches = sortPokemon(
        filterPokemon(all, {
          q: query ?? "",
          types: [...new Set(types ?? [])],
          generation,
          forms: includeForms ? "all" : "none",
        }),
        "number",
        "asc",
      );
      const shown = matches.slice(0, limit);
      const header =
        matches.length === 0
          ? "No Pokémon match these filters."
          : `${matches.length} match${matches.length === 1 ? "" : "es"}` +
            (matches.length > shown.length ? ` (showing the first ${shown.length})` : "") +
            ":";
      return toolResult([header, ...shown.map(pokemonLine)].join("\n"), {
        total: matches.length,
        results: shown.map((p) => ({
          number: p.speciesId,
          name: p.name,
          displayName: displayName(p),
          types: p.types.map(typeRef),
          generation: p.generation,
        })),
      });
    },
  );
}
