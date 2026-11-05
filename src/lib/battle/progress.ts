import { z } from "zod";
import {
  ACHIEVEMENTS,
  DAILY_ITEM_WINS,
  DAILY_STREAK_BONUS,
  HISTORY_SIZE,
  MAX_BATTLES,
  RANKS,
  TRAINER_NAME_MAX,
  XP,
  type RankId,
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
import { battleCount, byName, gymRunSchema, type GymMode, type GymRun } from "./run";
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
  /** Most battles won in a single gym run (out of 5). */
  best: count,
  /** Most Team Rocket members beaten in one daily gauntlet (out of 10). */
  dailyBest: count,
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
  dailyBest: 0,
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

/** Whether a finished run earns the day's item (beating James in the daily gauntlet). */
export const earnsDailyItem = (run: GymRun) =>
  run.mode === "daily" && !run.practice && Boolean(run.daily) && battlesWon(run) >= DAILY_ITEM_WINS;

/** Adds the day's item to the bag when a (non-practice) daily run beats James. */
export function addDailyItem(bag: Bag, run: GymRun): Bag {
  if (!earnsDailyItem(run) || !run.daily) return bag;
  const item = dailyItem(run.daily);
  return { ...bag, [item]: (bag[item] ?? 0) + 1 };
}

export const battlesWon = (run: GymRun) => run.history.filter((r) => r.won).length;

/** Badges earned across modes (the daily challenge has none). */
export const badgeCount = (stats: GymStats) => stats.cleared.easy + stats.cleared.hard;

/** The Pokéball a finished run is worth: the best of its mode's thresholds it reached. */
export function rewardFor(run: GymRun): Ball | undefined {
  const wins = battlesWon(run);
  return GYMS[run.mode].rewards.filter((reward) => wins >= reward.wins).at(-1)?.ball;
}

/** The ball for clearing a mode (its top reward). */
export const topBall = (mode: GymMode): Ball | undefined => GYMS[mode].rewards.at(-1)?.ball;

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
    best: run.mode === "daily" ? stats.best : Math.max(stats.best, battlesWon(run)),
    dailyBest: run.mode === "daily" ? Math.max(stats.dailyBest, battlesWon(run)) : stats.dailyBest,
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
  const leader = run.history.find((r) => r.battle === battleCount(run) - 1);
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
  battlesWon: count.max(MAX_BATTLES),
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

/** One square per battle: won, lost, not reached. Spoiler-free, like 7a0 or Wordle. */
export function resultGrid(won: number, badge: boolean, total = 5): string {
  return Array.from({ length: total }, (_, index) =>
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
  const total = GYMS[result.mode].battles.length;
  const score = `${resultGrid(result.battlesWon, result.won, total)} ${m.shareScore(result.battlesWon, total)}`;
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

// ---- Trainer: a name (no login), a level from XP, and the history of finished runs ----

export const trainerSchema = z.object({
  name: z.string().trim().min(1).max(TRAINER_NAME_MAX),
  /** Five digits, like the trainer ID on a Trainer Card. */
  id: z.string().regex(/^\d{5}$/),
  /** When the card was issued (YYYY-MM-DD). */
  since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type Trainer = z.infer<typeof trainerSchema>;

/** Cleans a typed name: trimmed, single spaces, at most `TRAINER_NAME_MAX` characters. */
export const cleanTrainerName = (name: string) =>
  name.replace(/\s+/g, " ").trim().slice(0, TRAINER_NAME_MAX);

/** XP a finished run gives: per battle won, plus the mode's bonus for clearing it. */
export function xpForRun(run: GymRun): number {
  if (run.practice) return 0;
  return battlesWon(run) * XP.battle + (run.phase === "won" ? XP.clear[run.mode] : 0);
}

/** Lifetime XP, derived from the stats (nothing extra to store). */
export function totalXp(stats: GymStats): number {
  return (
    stats.battlesWon * XP.battle +
    stats.cleared.easy * XP.clear.easy +
    stats.cleared.hard * XP.clear.hard +
    stats.cleared.daily * XP.clear.daily +
    stats.caught.length * XP.legendary
  );
}

/** XP needed to reach `level` (1 → 0, 2 → 100, 3 → 300, 4 → 600…). */
export const xpForLevel = (level: number) => 50 * level * (level - 1);

export function levelFor(xp: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const rank: RankId = RANKS.filter((r) => level >= r.level).at(-1)?.id ?? "rookie";
  return { level, rank, xp, into: xp - floor, needed: next - floor, next };
}

export const historyEntrySchema = z.object({
  /** ISO timestamp. */
  finishedAt: z.string(),
  run: gymRunSchema,
});
export type HistoryEntry = z.infer<typeof historyEntrySchema>;
export const historySchema = z.array(historyEntrySchema).max(HISTORY_SIZE);

/** Newest first, keeping the last `HISTORY_SIZE` runs. */
export function addToHistory(
  history: readonly HistoryEntry[],
  run: GymRun,
  finishedAt: string,
): HistoryEntry[] {
  return [{ finishedAt, run }, ...history].slice(0, HISTORY_SIZE);
}

// ---- Daily streak: play on consecutive days (any result) ----

const previousDay = (key: string) => pastDays(key, 1)[0] ?? key;

/**
 * Days in a row with a daily result, ending on `today` (or yesterday, if today isn't played yet:
 * the streak is still alive until midnight).
 */
export function dailyStreak(results: readonly DailyResult[], today: string): number {
  const played = new Set(results.map((r) => r.date));
  let day = played.has(today) ? today : previousDay(today);
  let streak = 0;
  while (played.has(day)) {
    streak++;
    day = previousDay(day);
  }
  return streak;
}

/**
 * Daily plays still needed (1–3) for the next streak bonus, today's included when it isn't played
 * yet. 1 with today unplayed means "play today and get the Master Ball".
 */
export function playsToStreakBonus(results: readonly DailyResult[], today: string): number {
  return DAILY_STREAK_BONUS - (dailyStreak(results, today) % DAILY_STREAK_BONUS);
}

/**
 * The streak a newly recorded daily result completes, when it earns the Master Ball bonus (every
 * `DAILY_STREAK_BONUS` days in a row), else undefined.
 */
export function streakBonus(
  before: readonly DailyResult[],
  after: readonly DailyResult[],
  day: string,
): number | undefined {
  if (after.length === before.length || !after.some((r) => r.date === day)) return undefined;
  const streak = dailyStreak(after, day);
  return streak > 0 && streak % DAILY_STREAK_BONUS === 0 ? streak : undefined;
}

/** Adds the streak's Master Ball to the stats. */
export const addStreakBall = (stats: GymStats): GymStats => ({
  ...stats,
  balls: { ...stats.balls, master: stats.balls.master + 1 },
});
