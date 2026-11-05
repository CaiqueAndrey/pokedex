import { z } from "zod";
import { ROCKET_PUZZLE, type Ball } from "@/config/gym";
import type { BattlePokemon, BattleResult } from "@/types/battle";
import type { TypeRelations } from "@/types/pokemon";
import { drawHand } from "./draft";
import { generateOpponent } from "./opponents";
import { rngFrom } from "./rng";
import { simulateBattle } from "./simulate";
import { battleStats, mvpIndex } from "./stats";
import { teamBst } from "./team";

/**
 * The daily Team Rocket ambush: a puzzle with everything in the open. Jessie and James field a fixed,
 * revealed team; you pick a few Pokémon from the day's hand and their order, and get a few attempts.
 * The battle is deterministic for a given team order, so retrying only helps if you change the plan.
 *
 * Fairness: a day's seed is only used when a target share of all legal ordered teams wins it
 * (`calibrate`), so no day is hopeless and none is trivial.
 */

export interface RocketPuzzle {
  date: string;
  /** The calibrated seed (the date plus a try number). */
  seed: string;
  /** The day's hand, weakest first. */
  hand: BattlePokemon[];
  /** Jessie and James's team, in the order it fights. */
  opponent: BattlePokemon[];
  /** Share of legal ordered teams that win (the day's difficulty). */
  winRate: number;
}

/** Every legal team: `size` different Pokémon from the hand, in order, within the strength cap. */
export function orderedTeams(
  hand: readonly BattlePokemon[],
  size: number = ROCKET_PUZZLE.pick,
  cap: number = ROCKET_PUZZLE.cap,
): BattlePokemon[][] {
  const teams: BattlePokemon[][] = [];
  const extend = (team: BattlePokemon[]) => {
    if (team.length === size) {
      teams.push(team);
      return;
    }
    for (const pokemon of hand) {
      if (team.includes(pokemon)) continue;
      const next = [...team, pokemon];
      if (teamBst(next) <= cap) extend(next);
    }
  };
  extend([]);
  return teams;
}

/** One attempt: the same team in the same order always plays out the same way. */
export function attemptBattle(
  puzzle: Pick<RocketPuzzle, "seed" | "opponent">,
  team: readonly BattlePokemon[],
  relations: TypeRelations,
): BattleResult {
  return simulateBattle(
    [...team],
    puzzle.opponent,
    relations,
    `${puzzle.seed}|${team.map((p) => p.name).join(",")}`,
  );
}

function candidate(
  pool: readonly BattlePokemon[],
  date: string,
  attempt: number,
): Omit<RocketPuzzle, "winRate"> {
  const seed = `rocket|${date}|${attempt}`;
  const regular = pool.filter((p) => !p.legendary);
  const signature = ROCKET_PUZZLE.signatures.flatMap(
    (name) => regular.find((p) => p.name === name) ?? [],
  );
  const bossFamilies = new Set(signature.map((p) => p.family));
  // Their aces' families stay out of the hand, and the hand's families out of their team.
  const hand = drawHand(
    regular.filter((p) => !bossFamilies.has(p.family)),
    rngFrom(seed, "hand"),
    ROCKET_PUZZLE.hand,
  );
  const handFamilies = new Set(hand.map((p) => p.family));
  const opponent = generateOpponent(
    regular.filter((p) => !handFamilies.has(p.family)),
    ROCKET_PUZZLE.opponentBudget,
    rngFrom(seed, "opponent"),
    ROCKET_PUZZLE.opponents,
    { signature },
  );
  return { date, seed, hand, opponent };
}

/** Share of legal ordered teams that beat the opponent. */
export function winRate(
  puzzle: Pick<RocketPuzzle, "seed" | "hand" | "opponent">,
  relations: TypeRelations,
): number {
  const teams = orderedTeams(puzzle.hand);
  if (teams.length === 0) return 0;
  const wins = teams.filter(
    (team) => attemptBattle(puzzle, team, relations).winner === "player",
  ).length;
  return wins / teams.length;
}

const cache = new Map<string, RocketPuzzle>();

/**
 * The day's puzzle: tries seeds `rocket|date|0`, `|1`, … and keeps the first whose win rate lands in
 * the target range (or, failing that, the one closest to its middle). Same input, same puzzle.
 */
export function calibrate(
  pool: readonly BattlePokemon[],
  relations: TypeRelations,
  date: string,
): RocketPuzzle {
  const key = `${date}|${pool.length}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const [low, high] = ROCKET_PUZZLE.winRange;
  const middle = (low + high) / 2;
  let best: RocketPuzzle | undefined;
  for (let attempt = 0; attempt < ROCKET_PUZZLE.maxSeeds; attempt++) {
    const puzzle = candidate(pool, date, attempt);
    const rate = winRate(puzzle, relations);
    const scored = { ...puzzle, winRate: rate };
    if (rate >= low && rate <= high) {
      best = scored;
      break;
    }
    if (!best || Math.abs(rate - middle) < Math.abs(best.winRate - middle)) best = scored;
  }
  const result = best as RocketPuzzle;
  cache.set(key, result);
  return result;
}

// ---- Attempts and rewards ----

export const rocketAttemptSchema = z.object({
  /** The team, in order (names). */
  order: z.array(z.string().min(1).max(60)).min(1).max(6),
  won: z.boolean(),
  /** Opponent Pokémon knocked out. */
  knocked: z.number().int().min(0).max(6),
  /** The opponent that did the most damage to you (the "why" of a defeat). */
  nemesis: z.string().max(60).optional(),
});
export type RocketAttempt = z.infer<typeof rocketAttemptSchema>;

export const rocketDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  attempts: z.array(rocketAttemptSchema).max(ROCKET_PUZZLE.attempts),
  /** Set once the day is over (won, or out of attempts). */
  result: z.enum(["won", "lost"]).optional(),
});
export type RocketDay = z.infer<typeof rocketDaySchema>;

export const rocketProgressSchema = z.object({ days: z.array(rocketDaySchema).max(30) });
export type RocketProgress = z.infer<typeof rocketProgressSchema>;
export const EMPTY_ROCKET: RocketProgress = { days: [] };

/** What an attempt's battle says: won, how many of theirs fell, and who beat you. */
export function toAttempt(
  team: readonly BattlePokemon[],
  opponent: readonly BattlePokemon[],
  result: BattleResult,
): RocketAttempt {
  const knocked = result.events.filter((e) => e.kind === "faint" && e.side === "opponent").length;
  const nemesis = mvpIndex(battleStats(result, "opponent"));
  return {
    order: team.map((p) => p.name),
    won: result.winner === "player",
    knocked,
    ...(nemesis === undefined ? {} : { nemesis: opponent[nemesis]?.name }),
  };
}

/** Adds an attempt to the day and closes it when won or out of attempts. A closed day is final. */
export function addAttempt(
  progress: RocketProgress,
  date: string,
  attempt: RocketAttempt,
): RocketProgress {
  const day: RocketDay = progress.days.find((d) => d.date === date) ?? { date, attempts: [] };
  if (day.result) return progress;
  const attempts = [...day.attempts, attempt];
  const result = attempt.won
    ? "won"
    : attempts.length >= ROCKET_PUZZLE.attempts
      ? "lost"
      : undefined;
  const updated: RocketDay = result ? { date, attempts, result } : { date, attempts };
  const days = [...progress.days.filter((d) => d.date !== date), updated]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);
  return { days };
}

/** The ball for winning on attempt `n` (1-based): sooner is better. */
export function rocketReward(attempts: number, won: boolean): Ball | undefined {
  if (!won) return undefined;
  return ROCKET_PUZZLE.rewards[Math.min(attempts, ROCKET_PUZZLE.rewards.length) - 1];
}

/** One row per attempt, one square per opponent Pokémon: knocked out in green. Spoiler-free. */
export function rocketGrid(attempts: readonly RocketAttempt[], opponents: number): string[] {
  return attempts.map(
    (a) =>
      "🟩".repeat(Math.min(a.knocked, opponents)) + "🟥".repeat(Math.max(0, opponents - a.knocked)),
  );
}

export function rocketShareText(day: RocketDay, origin: string, title: string): string {
  const total = ROCKET_PUZZLE.attempts;
  const score = day.result === "won" ? `${day.attempts.length}/${total}` : `X/${total}`;
  const date = `${day.date.slice(8, 10)}/${day.date.slice(5, 7)}`;
  return [
    `${title} ${date} · ${score}`,
    ...rocketGrid(day.attempts, ROCKET_PUZZLE.opponents),
    `${origin}/gym`,
  ].join("\n");
}
