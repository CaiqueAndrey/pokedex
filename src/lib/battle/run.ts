import { z } from "zod";
import { GYM, MODE_BUDGETS, REROLLS_PER_RUN, TEAM_SIZE } from "@/config/gym";
import type { BattlePokemon, BattleResult } from "@/types/battle";
import type { TypeRelations } from "@/types/pokemon";
import { draftRound, type DraftRound } from "./draft";
import { generateOpponent } from "./opponents";
import { rngFrom } from "./rng";
import { simulateBattle } from "./simulate";

/**
 * A gym run is a small state machine. Everything random is derived from the seed plus what the
 * player did, so the run is reproducible and safe to persist in localStorage:
 *
 *   draft (6 picks) → ready (battle n) → … → won | lost
 */
export const battleRecordSchema = z.object({
  battle: z.number().int().min(0),
  won: z.boolean(),
  /** Team order used (names). */
  order: z.array(z.string()),
  /** Opponent team (names, in order). */
  opponent: z.array(z.string()),
  /** Player Pokémon still standing at the end. */
  remaining: z.number().int().min(0),
  /** Opponent Pokémon still standing at the end. */
  opponentRemaining: z.number().int().min(0),
});

export type BattleRecord = z.infer<typeof battleRecordSchema>;
export type GymMode = "easy" | "hard";

export const gymRunSchema = z.object({
  seed: z.string().min(1).max(40),
  picks: z.array(z.string()).max(TEAM_SIZE),
  rerollsUsed: z.number().int().min(0).max(REROLLS_PER_RUN),
  /** Team order chosen before the next battle (names). */
  order: z.array(z.string()).max(TEAM_SIZE),
  /** Index of the next battle (0-based). */
  battle: z.number().int().min(0).max(GYM.battles.length),
  phase: z.enum(["draft", "ready", "won", "lost"]),
  /** Easy shows the opponent's team and your stats; hard hides the opponent. */
  mode: z.enum(["easy", "hard"]).default("easy"),
  /** One entry per battle fought in this run (a new run starts empty). */
  history: z.array(battleRecordSchema).max(GYM.battles.length).default([]),
});

export type GymRun = z.infer<typeof gymRunSchema>;

export function startRun(seed: string, mode: GymMode = "easy"): GymRun {
  return {
    seed,
    picks: [],
    rerollsUsed: 0,
    order: [],
    battle: 0,
    phase: "draft",
    mode,
    history: [],
  };
}

export function byName(pool: readonly BattlePokemon[]) {
  return new Map(pool.map((p) => [p.name, p]));
}

function resolve(names: readonly string[], pool: readonly BattlePokemon[]): BattlePokemon[] {
  const map = byName(pool);
  return names.flatMap((name) => map.get(name) ?? []);
}

export const playerTeam = (run: GymRun, pool: readonly BattlePokemon[]) =>
  resolve(run.order.length === run.picks.length ? run.order : run.picks, pool);

export function currentDraft(run: GymRun, pool: readonly BattlePokemon[]): DraftRound {
  const rng = rngFrom(run.seed, "draft", run.picks.length, run.rerollsUsed);
  return draftRound(pool, resolve(run.picks, pool), rng, MODE_BUDGETS[run.mode].player);
}

export function pickPokemon(run: GymRun, name: string, pool: readonly BattlePokemon[]): GymRun {
  if (run.phase !== "draft") return run;
  const round = currentDraft(run, pool);
  if (!round.offers.some((offer) => offer.name === name) || round.blocked.includes(name))
    return run;
  const picks = [...run.picks, name];
  const done = picks.length === TEAM_SIZE;
  return { ...run, picks, order: done ? picks : [], phase: done ? "ready" : "draft" };
}

export function reroll(run: GymRun): GymRun {
  if (run.phase !== "draft" || run.rerollsUsed >= REROLLS_PER_RUN) return run;
  return { ...run, rerollsUsed: run.rerollsUsed + 1 };
}

export function reorder(run: GymRun, order: string[]): GymRun {
  const same = order.length === run.picks.length && order.every((name) => run.picks.includes(name));
  return same && run.phase === "ready" ? { ...run, order } : run;
}

export function opponentFor(run: GymRun, battle: number, pool: readonly BattlePokemon[]) {
  const config = GYM.battles[battle];
  if (!config) return [];
  const budget = Math.round(MODE_BUDGETS[run.mode].opponents * config.budgetFactor);
  return generateOpponent(pool, budget, rngFrom(run.seed, "opponent", battle));
}

export function battleFor(
  run: GymRun,
  pool: readonly BattlePokemon[],
  relations: TypeRelations,
): BattleResult {
  const team = playerTeam(run, pool);
  const opponent = opponentFor(run, run.battle, pool);
  return simulateBattle(
    team,
    opponent,
    relations,
    `${run.seed}|battle|${run.battle}|${run.order.join(",")}`,
  );
}

/** Applies a finished battle: records it, then moves to the next battle, the badge, or the end. */
export function applyResult(
  run: GymRun,
  result: BattleResult,
  pool: readonly BattlePokemon[],
): GymRun {
  if (run.phase !== "ready") return run;
  const fainted = (side: "player" | "opponent") =>
    result.events.filter((e) => e.kind === "faint" && e.side === side).length;
  const team = playerTeam(run, pool);
  const opponent = opponentFor(run, run.battle, pool);
  const record: BattleRecord = {
    battle: run.battle,
    won: result.winner === "player",
    order: team.map((p) => p.name),
    opponent: opponent.map((p) => p.name),
    remaining: team.length - fainted("player"),
    opponentRemaining: opponent.length - fainted("opponent"),
  };
  const history = [...run.history, record];
  if (!record.won) return { ...run, history, phase: "lost" };
  const battle = run.battle + 1;
  return { ...run, history, battle, phase: battle >= GYM.battles.length ? "won" : "ready" };
}
