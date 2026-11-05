import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { attackMatchups, computeMatchups, groupMatchups } from "@/lib/type-effectiveness";
import type { McpDeps } from "../context";
import { pokemonTypeSchema, toolResult, typeList, typeRef, typeRefSchema } from "../format";

const refs = z.array(typeRefSchema);

const outputSchema = {
  types: refs,
  defense: z.object({
    weak4: refs,
    weak2: refs,
    resist2: refs,
    resist4: refs,
    immune: refs,
  }),
  offense: z.array(
    z.object({ type: typeRefSchema, superEffective: refs, notVeryEffective: refs, noEffect: refs }),
  ),
};

export function registerGetTypeMatchups(server: McpServer, { pokedex }: McpDeps) {
  server.registerTool(
    "get_type_matchups",
    {
      title: "Type matchups",
      description:
        "Damage multipliers for a type combination: as a defender (4×/2× weaknesses, " +
        "resistances, immunities) and, for each type as an attacking move type, what it hits " +
        "super effectively. Takes types, not Pokémon: call get_pokemon first to learn its types.",
      inputSchema: {
        types: z
          .array(pokemonTypeSchema)
          .min(1)
          .max(2)
          .refine((types) => new Set(types).size === types.length, "Types must be different.")
          .describe('One or two English type slugs, e.g. ["fire", "flying"].'),
      },
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ types }) => {
      const relations = await pokedex.getTypeRelations();
      const groups = groupMatchups(computeMatchups(types, relations));
      const offense = types.map((type) => ({ type, ...attackMatchups(type, relations) }));

      const text = [
        `Defending as ${typeList(types)}:`,
        `- 4× weak: ${typeList(groups.weak4)}`,
        `- 2× weak: ${typeList(groups.weak2)}`,
        `- ½× resists: ${typeList(groups.resist)}`,
        `- ¼× resists: ${typeList(groups.resist4)}`,
        `- 0× immune: ${typeList(groups.immune)}`,
        ...offense.map(
          (o) =>
            `Attacking with ${o.type}: 2× against ${typeList(o.superEffective)}; ` +
            `½× against ${typeList(o.notVeryEffective)}; 0× against ${typeList(o.noEffect)}`,
        ),
      ].join("\n");

      return toolResult(text, {
        types: types.map(typeRef),
        defense: {
          weak4: groups.weak4.map(typeRef),
          weak2: groups.weak2.map(typeRef),
          resist2: groups.resist.map(typeRef),
          resist4: groups.resist4.map(typeRef),
          immune: groups.immune.map(typeRef),
        },
        offense: offense.map((o) => ({
          type: typeRef(o.type),
          superEffective: o.superEffective.map(typeRef),
          notVeryEffective: o.notVeryEffective.map(typeRef),
          noEffect: o.noEffect.map(typeRef),
        })),
      });
    },
  );
}
