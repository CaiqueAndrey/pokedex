import { z } from "zod";
import {
  ACHIEVEMENTS,
  BALL_FOR_CLEAR,
  BALL_FOR_WINS,
  BATTLES_PER_RUN,
  BUDGET_CHAMPION_BST,
  DAILY_HISTORY,
  GYMS,
  REWARD_ITEM_NAMES,
  VARIETY_CHAMPION_TYPES,
  type AchievementId,
  type Ball,
  type RewardItemName,
} from "@/config/gym";
import { messages } from "@/config/messages";
import type { BattlePokemon } from "@/types/battle";
import { hashString } from "./rng";
import { byName, type GymMode, type GymRun } from "./run";
import { teamBst } from "./team";

/**
 * Progress across runs: lifetime stats, Pokéball rewards, achievements and daily challenge results.
 * All pure; the UI persists them in localStorage when a run ends.
 */
const count = z.number().int().min(0);

export const gymStatsSchema = z.object({
  runs: count,
  /** Runs cleared (all five battles won), per mode. */
  cleared: z.object({ easy: count, hard: count, daily: count }),
  /** Pokéballs won, per kind. */
  balls: z.object({ poke: count, great: count, ultra: count, master: count }),
  battlesWon: count,
  /** Most battles won in a single run. */
  best: count,
  /** Runs cleared in a row (a defeat resets it). */
  streak: count,
  bestStreak: count,
  /** How often each Pokémon was drafted (name → runs). */
  used: z.record(z.string(), count),
  /** Legendaries caught with a Master Ball (names, first catch first). */
  caught: z.array(z.string()),
  /** Last mode chosen on the start screen (the daily challenge doesn't change it). */
  lastMode: z.enum(["easy", "hard"]).optional(),
});

export type GymStats = z.infer<typeof gymStatsSchema>;

export const EMPTY_STATS: GymStats = {
  runs: 0,
  cleared: { easy: 0, hard: 0, daily: 0 },
  balls: { poke: 0, great: 0, ultra: 0, master: 0 },
  battlesWon: 0,
  best: 0,
  streak: 0,
  bestStreak: 0,
  used: {},
  caught: [],
};

/** Spends a Master Ball (for a legendary encounter); a no-op without one. */
export function spendMasterBall(stats: GymStats): GymStats {
  if (stats.balls.master <= 0) return stats;
  return { ...stats, balls: { ...stats.balls, master: stats.balls.master - 1 } };
}

/** Records a legendary caught in an encounter (each one counted once). */
export function catchLegendary(stats: GymStats, name: string): GymStats {
  return stats.caught.includes(name) ? stats : { ...stats, caught: [...stats.caught, name] };
}

/** The bag: reward items won (name → count). */
export const bagSchema = z.record(z.string(), count);
export type Bag = z.infer<typeof bagSchema>;

/** Today's item: the daily challenge's prize, the same for everyone on the same day. */
export function dailyItem(key: string): RewardItemName {
  return REWARD_ITEM_NAMES[hashString(`item|${key}`) % REWARD_ITEM_NAMES.length] ?? "rare-candy";
}

/** Adds the day's item to the bag when a (non-practice) daily challenge is cleared. */
export function addDailyItem(bag: Bag, run: GymRun): Bag {
  if (run.mode !== "daily" || run.phase !== "won" || run.practice || !run.daily) return bag;
  const item = dailyItem(run.daily);
  return { ...bag, [item]: (bag[item] ?? 0) + 1 };
}

export const battlesWon = (run: GymRun) => run.history.filter((r) => r.won).length;

/** Badges earned across modes (the daily challenge has none). */
export const badgeCount = (stats: GymStats) => stats.cleared.easy + stats.cleared.hard;

/**
 * The Pokéball a finished run is worth: three wins a Poké Ball, four a Great Ball; clearing the run
 * the mode's top ball (Ultra Ball in easy, Master Ball in hard and in the daily challenge).
 */
export function rewardFor(run: GymRun): Ball | undefined {
  return run.phase === "won" ? BALL_FOR_CLEAR[run.mode] : BALL_FOR_WINS[battlesWon(run)];
}

/** Folds a finished (won or lost) run into the lifetime stats. Practice runs don't count. */
export function recordRun(stats: GymStats, run: GymRun): GymStats {
  if (run.practice) return stats;
  const won = run.phase === "won";
  const streak = won ? stats.streak + 1 : 0;
  const used = { ...stats.used };
  for (const name of run.picks) used[name] = (used[name] ?? 0) + 1;
  const reward = rewardFor(run);
  const lastMode = run.mode === "daily" ? stats.lastMode : run.mode;
  return {
    ...stats,
    runs: stats.runs + 1,
    cleared: { ...stats.cleared, [run.mode]: stats.cleared[run.mode] + (won ? 1 : 0) },
    balls: reward ? { ...stats.balls, [reward]: stats.balls[reward] + 1 } : stats.balls,
    battlesWon: stats.battlesWon + battlesWon(run),
    best: Math.max(stats.best, battlesWon(run)),
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    used,
    ...(lastMode ? { lastMode } : {}),
  };
}

/** The most drafted Pokémon (ties: first drafted), if any. */
export function favoritePick(stats: GymStats): string | undefined {
  let best: [string, number] | undefined;
  for (const entry of Object.entries(stats.used)) if (!best || entry[1] > best[1]) best = entry;
  return best?.[0];
}

/** Achievements this finished run unlocks (`stats` already includes it). */
export function achievementsFor(
  run: GymRun,
  pool: readonly BattlePokemon[],
  stats: GymStats,
): AchievementId[] {
  if (run.practice) return [];
  const map = byName(pool);
  const team = run.picks.flatMap((name) => map.get(name) ?? []);
  const won = run.phase === "won";
  const leader = run.history.find((r) => r.battle === BATTLES_PER_RUN - 1);
  const unlocked: Record<AchievementId, boolean> = {
    "first-win": run.history.some((r) => r.won),
    badge: won && run.mode === "easy",
    "hard-badge": won && run.mode === "hard",
    "daily-badge": won && run.mode === "daily",
    "both-badges": stats.cleared.easy > 0 && stats.cleared.hard > 0,
    "budget-badge": won && teamBst(team) <= BUDGET_CHAMPION_BST,
    "flawless-leader": Boolean(leader?.won && leader.remaining === team.length),
    "baby-champion": won && team.some((p) => p.baby),
    "variety-champion": won && new Set(team.flatMap((p) => p.types)).size >= VARIETY_CHAMPION_TYPES,
    "streak-3": stats.streak >= 3,
    "master-ball": rewardFor(run) === "master",
    "legend-champion": won && team.some((p) => p.legendary),
  };
  return ACHIEVEMENTS.filter((id) => unlocked[id]);
}

/** Local calendar date as YYYY-MM-DD: the daily challenge changes at the player's midnight. */
export function dailyKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Everyone gets the same seed on the same day. */
export const dailySeed = (key: string) => `dia-${key}`;

export const dailyResultSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  won: z.boolean(),
  battlesWon: count.max(BATTLES_PER_RUN),
});

export type DailyResult = z.infer<typeof dailyResultSchema>;

export const dailyResultsSchema = z.array(dailyResultSchema).max(DAILY_HISTORY);

/** Records the day's attempt (only the first one counts) and keeps the most recent days. */
export function recordDaily(results: readonly DailyResult[], run: GymRun): DailyResult[] {
  if (!run.daily || run.practice || results.some((r) => r.date === run.daily)) return [...results];
  const entry: DailyResult = {
    date: run.daily,
    won: run.phase === "won",
    battlesWon: battlesWon(run),
  };
  return [...results, entry].slice(-DAILY_HISTORY);
}

/** One square per gym battle: won, lost, not reached. Spoiler-free, like 7a0 or Wordle. */
export function resultGrid(won: number, badge: boolean): string {
  return Array.from({ length: BATTLES_PER_RUN }, (_, index) =>
    index < won ? "🟩" : index === won && !badge ? "🟥" : "⬛",
  ).join("");
}

/** "2026-11-05" → "05/11". */
export const formatDailyDate = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}`;

export interface ShareResult {
  mode: GymMode;
  battlesWon: number;
  won: boolean;
  /** Daily challenge date (YYYY-MM-DD), or the seed of a regular run. */
  daily?: string;
  seed?: string;
}

/**
 * The spoiler-free summary to share, e.g. "Equipe Rocket · Desafio do dia 05/11 / 🟩🟩🟥⬛⬛ 2/5 /
 * <link>". Regular runs link their seed, so a friend can draft from the same dice.
 */
export function shareText(result: ShareResult, origin: string): string {
  const m = messages.gym;
  const label = result.daily
    ? `${m.daily} ${formatDailyDate(result.daily)}`
    : `${m.shareSeed(result.seed ?? "")} · ${m.modes[result.mode].label}`;
  const url = result.daily || !result.seed ? `${origin}/gym` : `${origin}/gym?seed=${result.seed}`;
  const score = `${resultGrid(result.battlesWon, result.won)} ${m.shareScore(result.battlesWon)}`;
  return [
    m.shareHeader(GYMS[result.mode].name, label),
    result.won ? `${score} 🏅` : score,
    url,
  ].join("\n");
}

/** The `count` days before `key` (YYYY-MM-DD), most recent first: the daily archive. */
export function pastDays(key: string, count: number): string[] {
  const [year = 0, month = 1, day = 1] = key.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => dailyKey(new Date(year, month - 1, day - i - 1)));
}
