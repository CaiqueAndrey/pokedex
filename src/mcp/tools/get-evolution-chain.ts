import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatName, formatNumber } from "@/lib/format";
import type { EvolutionNode } from "@/types/pokemon";
import { resolvePokemon, type McpDeps } from "../context";
import { toolError, toolResult } from "../format";
import { nameSchema } from "./get-pokemon";

const stageSchema = z.object({
  number: z.number(),
  name: z.string(),
  displayName: z.string(),
  /** 1 = base form. */
  stage: z.number(),
  evolvesFrom: z.string().optional(),
  trigger: z.string().optional(),
});

const outputSchema = { species: z.string(), stages: z.array(stageSchema) };

type Stage = z.infer<typeof stageSchema>;

/** Depth-first, so each stage comes right after the one it evolves from. */
function flatten(node: EvolutionNode, stage = 1, from?: string): Stage[] {
  const self: Stage = {
    number: node.id,
    name: node.name,
    displayName: formatName(node.name),
    stage,
    ...(from ? { evolvesFrom: from } : {}),
    ...(from && node.trigger ? { trigger: node.trigger } : {}),
  };
  return [self, ...node.evolvesTo.flatMap((next) => flatten(next, stage + 1, node.name))];
}

export function registerGetEvolutionChain(server: McpServer, { pokedex }: McpDeps) {
  server.registerTool(
    "get_evolution_chain",
    {
      title: "Evolution chain",
      description:
        "The whole evolution family of a Pokémon (branches included, e.g. Eevee) with how each " +
        "stage evolves: level, item, trade, friendship. Triggers read as the app shows them, in " +
        'Portuguese ("Nível 16", "Troca", "Amizade 220", item names like "Thunder Stone").',
      inputSchema: { name: nameSchema },
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ name }) => {
      const resolved = await resolvePokemon(pokedex, [name]);
      if (!resolved.ok) return toolError(resolved.message);
      const [detail] = resolved.details;
      const chain = detail && (await pokedex.getEvolutionChain(detail.evolutionChainId));
      if (!detail || !chain) return toolError(`No evolution chain found for "${name}".`);

      const stages = flatten(chain);
      const lines = stages.map((s) => {
        const indent = "  ".repeat(s.stage - 1);
        const how = s.trigger ? ` — ${s.trigger}` : "";
        const self = s.name === detail.speciesName ? " ← this one" : "";
        return `${indent}- ${formatNumber(s.number)} ${s.name}${how}${self}`;
      });
      const text =
        stages.length === 1
          ? `${detail.speciesName} does not evolve.`
          : [`Evolution chain of ${detail.speciesName}:`, ...lines].join("\n");
      return toolResult(text, { species: detail.speciesName, stages });
    },
  );
}
