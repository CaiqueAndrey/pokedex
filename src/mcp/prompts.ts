import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { completable } from "@modelcontextprotocol/sdk/server/completable.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { GENERATIONS } from "@/config/pokedex";
import { toSlug } from "@/lib/search";
import type { McpDeps } from "./context";

export const TEAM_STYLES = ["balanced", "offensive", "defensive", "fast", "mono-type"] as const;

const startsWith = (options: readonly string[], value: string) =>
  options.filter((option) => option.startsWith(value.toLowerCase()));

const userPrompt = (text: string): GetPromptResult => ({
  messages: [{ role: "user", content: { type: "text", text } }],
});

export function registerPrompts(server: McpServer, { pokedex }: McpDeps) {
  const completeName = async (value: string) => {
    const prefix = toSlug(value);
    const all = await pokedex.listPokemon();
    return all
      .filter((p) => p.isDefault && p.name.startsWith(prefix))
      .slice(0, 20)
      .map((p) => p.name);
  };

  server.registerPrompt(
    "build-team",
    {
      title: "Build a team",
      description: "Build a six-Pokémon team with good type coverage, checked with the tools.",
      argsSchema: {
        style: completable(
          z
            .string()
            .optional()
            .describe(`Team style: ${TEAM_STYLES.join(", ")} (or your own).`),
          (value) => startsWith(TEAM_STYLES, value ?? ""),
        ),
        generation: completable(
          z.string().optional().describe("Only Pokémon from this generation (1–9)."),
          (value) => startsWith(GENERATIONS.map(String), value ?? ""),
        ),
      },
    },
    ({ style, generation }) =>
      userPrompt(
        [
          `Build me a team of six Pokémon. Style: ${style || "balanced"}.`,
          generation
            ? `Only use Pokémon introduced in generation ${generation}.`
            : "Any generation is fine; no legendaries or mythicals unless I ask.",
          "",
          "Work with the pokedex tools, not from memory:",
          "1. Use search_pokemon (by type and generation) to find candidates.",
          "2. Use get_pokemon to check the stats of the ones you like.",
          "3. Run analyze_team on the draft and swap members until no type is a weakness of three",
          "   or more members and the team's types hit as many types as possible.",
          "",
          "Answer in Brazilian Portuguese: the six names, each one's role in a sentence, and the",
          "remaining weak spots of the team.",
        ].join("\n"),
      ),
  );

  server.registerPrompt(
    "explain-matchup",
    {
      title: "Explain a matchup",
      description: "Explain who wins a one-on-one between two Pokémon, and why.",
      argsSchema: {
        attacker: completable(z.string().describe("First Pokémon (name or slug)."), completeName),
        defender: completable(z.string().describe("Second Pokémon (name or slug)."), completeName),
      },
    },
    ({ attacker, defender }) =>
      userPrompt(
        [
          `Explain the matchup ${attacker} vs ${defender}.`,
          "",
          "Use the pokedex tools: get_pokemon for both (types and stats), get_type_matchups for",
          "each one's types, and simulate_battle with each as a one-Pokémon team (try two or",
          "three seeds if the result looks close).",
          "",
          "Answer in Brazilian Portuguese: who has the type advantage, how speed and stats change",
          "it, and who usually wins in the simplified battle. Keep it short.",
        ].join("\n"),
      ),
  );
}
