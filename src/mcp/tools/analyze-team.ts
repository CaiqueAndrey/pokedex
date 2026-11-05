import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { displayName } from "@/lib/format";
import { offensiveGaps, sharedWeaknesses, teamCoverage } from "@/lib/type-effectiveness";
import { resolvePokemon, type McpDeps } from "../context";
import {
  pokemonLine,
  toolError,
  toolResult,
  typeList,
  typeRef,
  typeRefSchema,
  typeText,
} from "../format";
import { nameSchema } from "./get-pokemon";

export const teamSchema = z.array(nameSchema).min(1).max(6);

const outputSchema = {
  members: z.array(
    z.object({ name: z.string(), displayName: z.string(), types: z.array(typeRefSchema) }),
  ),
  /** Attacking types at least one member is weak to, worst first. */
  threats: z.array(
    z.object({ type: typeRefSchema, weak: z.number(), resist: z.number(), immune: z.number() }),
  ),
  sharedWeaknesses: z.array(typeRefSchema),
  /** Threats that no member resists. */
  unanswered: z.array(typeRefSchema),
  /** Defending types none of the team's own types hits super effectively. */
  offensiveGaps: z.array(typeRefSchema),
};

export function registerAnalyzeTeam(server: McpServer, { pokedex }: McpDeps) {
  server.registerTool(
    "analyze_team",
    {
      title: "Analyze a team",
      description:
        "Type coverage of a team of 1 to 6 Pokémon: which attacking types threaten it (how many " +
        "members are weak / resist / are immune), weaknesses shared by several members, threats " +
        "nobody resists, and defending types the team's own types can't hit super effectively.",
      inputSchema: { names: teamSchema.describe("The team, 1 to 6 Pokémon names or slugs.") },
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ names }) => {
      const resolved = await resolvePokemon(pokedex, names);
      if (!resolved.ok) return toolError(resolved.message);
      const members = resolved.details;
      const relations = await pokedex.getTypeRelations();

      const rows = teamCoverage(
        members.map((m) => m.types),
        relations,
      );
      const threats = rows
        .filter((row) => row.weak > 0)
        .sort((a, b) => b.weak - b.resist - (a.weak - a.resist) || b.weak - a.weak);
      // With fewer than three members, "shared" means every member.
      const shared = sharedWeaknesses(rows, Math.min(3, members.length));
      const unanswered = threats.filter((row) => row.resist === 0).map((row) => row.type);
      const gaps = offensiveGaps([...new Set(members.flatMap((m) => m.types))], relations);

      const text = [
        `Team (${members.length}):`,
        ...members.map((m) => `- ${pokemonLine(m)}`),
        "Threats (attacking type: members weak / resist / immune):",
        ...threats.map(
          (row) => `- ${typeText(row.type)}: ${row.weak} / ${row.resist} / ${row.immune}`,
        ),
        `Shared weaknesses: ${typeList(shared)}`,
        `Threats nobody resists: ${typeList(unanswered)}`,
        `Same-type offense can't hit 2×: ${typeList(gaps)}`,
      ].join("\n");

      return toolResult(text, {
        members: members.map((m) => ({
          name: m.name,
          displayName: displayName(m),
          types: m.types.map(typeRef),
        })),
        threats: threats.map((row) => ({
          type: typeRef(row.type),
          weak: row.weak,
          resist: row.resist,
          immune: row.immune,
        })),
        sharedWeaknesses: shared.map(typeRef),
        unanswered: unanswered.map(typeRef),
        offensiveGaps: gaps.map(typeRef),
      });
    },
  );
}
