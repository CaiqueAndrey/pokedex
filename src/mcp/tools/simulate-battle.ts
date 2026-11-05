import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BATTLE_LEVEL } from "@/config/gym";
import { newSeed } from "@/lib/battle/rng";
import { simulateBattle } from "@/lib/battle/simulate";
import { battleStats, mvpIndex } from "@/lib/battle/stats";
import { toBattlePokemon } from "@/lib/battle/team";
import type { BattlePokemon, BattleResult, Side } from "@/types/battle";
import { resolvePokemon, type McpDeps } from "../context";
import { toolError, toolResult } from "../format";
import { teamSchema } from "./analyze-team";

/** The model reads "team" / "opponent"; the engine says "player" / "opponent". */
const SIDE_NAME: Record<Side, "team" | "opponent"> = { player: "team", opponent: "opponent" };

const fighterSchema = z.object({
  name: z.string(),
  hpLeft: z.number(),
  maxHp: z.number(),
  damage: z.number(),
  knockouts: z.number(),
});

const outputSchema = {
  winner: z.enum(["team", "opponent"]),
  seed: z.string(),
  attacks: z.number(),
  team: z.array(fighterSchema),
  opponent: z.array(fighterSchema),
  mvp: z.object({ team: z.string().optional(), opponent: z.string().optional() }),
  log: z.array(z.string()),
};

/** Only what changes the outcome: knockouts and who comes in next. */
export function battleLog(result: BattleResult, teams: Record<Side, BattlePokemon[]>): string[] {
  const nameOf = (side: Side, index: number) =>
    `${teams[side][index]?.name ?? "?"} (${SIDE_NAME[side]})`;
  const log: string[] = [];
  let attacks = 0;
  for (const event of result.events) {
    if (event.kind === "send") {
      log.push(`${nameOf(event.side, event.index)} comes in`);
    } else if (event.kind === "attack") {
      attacks++;
      const defenderSide: Side = event.side === "player" ? "opponent" : "player";
      if (event.hpLeft === 0) {
        const how = event.struggle
          ? "Struggle"
          : `${event.type} (${event.effectiveness}×${event.critical ? ", critical" : ""})`;
        log.push(
          `attack ${attacks}: ${nameOf(event.side, event.attacker)} knocks out ${nameOf(defenderSide, event.defender)} with ${how}`,
        );
      }
      if (event.attackerHpLeft === 0) {
        log.push(`attack ${attacks}: ${nameOf(event.side, event.attacker)} faints from recoil`);
      }
    } else if (event.kind === "end") {
      log.push(`${SIDE_NAME[event.winner]} wins after ${attacks} attacks`);
    }
  }
  return log;
}

export function registerSimulateBattle(server: McpServer, { pokedex }: McpDeps) {
  server.registerTool(
    "simulate_battle",
    {
      title: "Simulate a battle",
      description:
        "Runs the Pokédex gym-mode battle engine between two teams of 1 to 6 Pokémon. Simplified " +
        `rules: level ${BATTLE_LEVEL}, no moves or abilities; each Pokémon attacks with whichever ` +
        "of its own types hits hardest, faster one first, and a fainted Pokémon is replaced by " +
        "the reserve with the best matchup. Deterministic: the same teams and seed give the same " +
        "result (a random seed is used and returned when omitted).",
      inputSchema: {
        team: teamSchema.describe("Your team, in order (the first one leads)."),
        opponent: teamSchema.describe("The opposing team, in order."),
        seed: z.string().min(1).max(40).optional().describe("Replay a battle with its seed."),
      },
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ team, opponent, seed: requestedSeed }) => {
      const [mine, theirs] = await Promise.all([
        resolvePokemon(pokedex, team),
        resolvePokemon(pokedex, opponent),
      ]);
      if (!mine.ok || !theirs.ok) {
        return toolError([mine, theirs].flatMap((r) => (r.ok ? [] : [r.message])).join("\n"));
      }
      const teams: Record<Side, BattlePokemon[]> = {
        player: mine.details.map(toBattlePokemon),
        opponent: theirs.details.map(toBattlePokemon),
      };
      const seed = requestedSeed ?? newSeed();
      const relations = await pokedex.getTypeRelations();
      const result = simulateBattle(teams.player, teams.opponent, relations, seed);

      const fighters = (side: Side) => {
        const stats = battleStats(result, side);
        return teams[side].map((pokemon, i) => ({
          name: pokemon.name,
          hpLeft: result.finalHp[side][i] ?? 0,
          maxHp: result.maxHp[side][i] ?? 0,
          damage: stats[i]?.damage ?? 0,
          knockouts: stats[i]?.knockouts ?? 0,
        }));
      };
      const mvp = (side: Side) => {
        const index = mvpIndex(battleStats(result, side));
        return index === undefined ? undefined : teams[side][index]?.name;
      };
      const summary = (side: Side) =>
        fighters(side)
          .map((f) => `${f.name} ${f.hpLeft}/${f.maxHp} HP, ${f.damage} dmg, ${f.knockouts} KO`)
          .join("; ");
      const log = battleLog(result, teams);
      const attacks = result.events.filter((e) => e.kind === "attack").length;
      const winner = SIDE_NAME[result.winner];

      const text = [
        `Winner: ${winner} (seed "${seed}", ${attacks} attacks)`,
        `Team: ${summary("player")}`,
        `Opponent: ${summary("opponent")}`,
        `MVP: team ${mvp("player") ?? "—"}, opponent ${mvp("opponent") ?? "—"}`,
        "Key events:",
        ...log.map((line) => `- ${line}`),
      ].join("\n");

      return toolResult(text, {
        winner,
        seed,
        attacks,
        team: fighters("player"),
        opponent: fighters("opponent"),
        mvp: { team: mvp("player"), opponent: mvp("opponent") },
        log,
      });
    },
  );
}
