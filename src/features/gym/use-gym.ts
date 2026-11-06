"use client";

import { useMemo, useSyncExternalStore } from "react";
import { z } from "zod";
import {
  DAILY_HISTORY,
  type AchievementId,
  type Ball,
  type BattleSpeed,
  type LegendarySet,
} from "@/config/gym";
import {
  EMPTY_STATS,
  achievementsFor,
  addDailyItem,
  addStreakBall,
  addToHistory,
  bagSchema,
  cleanTrainerName,
  battlesWon,
  catchAndComplete,
  dailyItem,
  dailyKey,
  dailyResultsSchema,
  playedDays,
  gymStatsSchema,
  historySchema,
  recordDaily,
  recordRun,
  spendMasterBall,
  streakBonus,
  trainerSchema,
  type Bag,
  type DailyResult,
  type GymStats,
  type HistoryEntry,
  type Trainer,
} from "@/lib/battle/progress";
import {
  EMPTY_ROCKET,
  addAttempt,
  rocketProgressSchema,
  rocketReward,
  type RocketAttempt,
  type RocketDay,
} from "@/lib/battle/puzzle";
import { gymRunSchema, type GymRun } from "@/lib/battle/run";
import type { TuneName } from "@/lib/sound/tunes";
import type { BattlePokemon } from "@/types/battle";
import { createListStore } from "@/lib/list-store";
import { STORAGE_KEYS } from "@/lib/storage";
import { createValueStore } from "@/lib/value-store";
import {
  addProgress,
  claimMission,
  forWeek,
  missionStateSchema,
  weekKey,
  type MissionId,
  type MissionState,
} from "@/lib/missions";
import { markDex, resetDex } from "../pokedex/use-dex-progress";
import { resetQuiz } from "../quiz/use-quiz";
import { playTune, vibrate } from "./sound";

const NO_DAILY: DailyResult[] = [];
const EMPTY_BAG: Bag = {};
const NO_HISTORY: HistoryEntry[] = [];

const runStore = createValueStore<GymRun | null>(
  STORAGE_KEYS.gymRun,
  gymRunSchema.nullable(),
  null,
);
const badgeStore = createListStore(STORAGE_KEYS.badges);
const tipStore = createListStore(STORAGE_KEYS.gymTips);

/** First-run tips already dismissed (ids). */
export function useTips() {
  const seen = useSyncExternalStore(
    tipStore.subscribe,
    tipStore.getSnapshot,
    tipStore.getServerSnapshot,
  );
  return { seen, dismiss: tipStore.add };
}

export function useGymRun() {
  const run = useSyncExternalStore(
    runStore.subscribe,
    runStore.getSnapshot,
    runStore.getServerSnapshot,
  );
  return { run, setRun: runStore.set };
}

export function useBadges() {
  const badges = useSyncExternalStore(
    badgeStore.subscribe,
    badgeStore.getSnapshot,
    badgeStore.getServerSnapshot,
  );
  return { badges, add: badgeStore.add };
}

const speedStore = createValueStore<BattleSpeed>(
  STORAGE_KEYS.battleSpeed,
  z.enum(["slow", "medium", "fast"]),
  "medium",
);

export function useBattleSpeed() {
  const speed = useSyncExternalStore(
    speedStore.subscribe,
    speedStore.getSnapshot,
    speedStore.getServerSnapshot,
  );
  return { speed, setSpeed: speedStore.set };
}

const soundStore = createValueStore<boolean>(STORAGE_KEYS.sound, z.boolean(), true);

/** Sound effects (and phone vibration) on or off, remembered across visits. */
export function useSound() {
  const enabled = useSyncExternalStore(
    soundStore.subscribe,
    soundStore.getSnapshot,
    soundStore.getServerSnapshot,
  );
  return { enabled, setEnabled: soundStore.set };
}

/** Plays an effect unless sound is off. Safe to call from any event handler. */
export function sfx(name: TuneName) {
  if (soundStore.getSnapshot()) playTune(name);
}

/** Vibrates (phones only) unless sound is off: the toggle covers both. */
export function haptic(pattern: number | number[]) {
  if (soundStore.getSnapshot()) vibrate(pattern);
}

const statsStore = createValueStore<GymStats>(STORAGE_KEYS.gymStats, gymStatsSchema, EMPTY_STATS);
const achievementStore = createListStore(STORAGE_KEYS.achievements);
const dailyStore = createValueStore<DailyResult[]>(
  STORAGE_KEYS.gymDaily,
  dailyResultsSchema,
  NO_DAILY,
);
const bagStore = createValueStore<Bag>(STORAGE_KEYS.gymBag, bagSchema, EMPTY_BAG);
const historyStore = createValueStore<HistoryEntry[]>(
  STORAGE_KEYS.gymHistory,
  historySchema,
  NO_HISTORY,
);
const NO_DAYS: string[] = [];
/** Days a daily game was played: the streak counts the gym's daily challenge and the quiz alike. */
const playedStore = createValueStore<string[]>(
  STORAGE_KEYS.playedDays,
  z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(DAILY_HISTORY * 2),
  NO_DAYS,
);
const rocketStore = createValueStore(STORAGE_KEYS.rocket, rocketProgressSchema, EMPTY_ROCKET);

/** The daily Rocket ambush: each day's attempts and result. */
export function useRocketProgress() {
  return useSyncExternalStore(
    rocketStore.subscribe,
    rocketStore.getSnapshot,
    rocketStore.getServerSnapshot,
  );
}

const missionStore = createValueStore<MissionState | null>(
  STORAGE_KEYS.missions,
  missionStateSchema.nullable(),
  null,
);

/** Feeds a game event to this week's missions. */
export function recordMission(id: MissionId, amount: number, how: "add" | "max" = "add") {
  missionStore.set(addProgress(missionStore.getSnapshot(), weekKey(new Date()), id, amount, how));
}

/** This week's mission state (a new week starts empty). */
export function useMissions(week: string) {
  const state = useSyncExternalStore(
    missionStore.subscribe,
    missionStore.getSnapshot,
    missionStore.getServerSnapshot,
  );
  return useMemo(() => forWeek(state, week), [state, week]);
}

/** Claims a finished mission: a Great Ball and mission XP. Returns false if it can't be claimed. */
export function claimMissionReward(id: MissionId): boolean {
  const current = forWeek(missionStore.getSnapshot(), weekKey(new Date()));
  const claimed = claimMission(current, id);
  if (claimed === current) return false;
  missionStore.set(claimed);
  const stats = statsStore.getSnapshot();
  statsStore.set({
    ...stats,
    missions: stats.missions + 1,
    balls: { ...stats.balls, great: stats.balls.great + 1 },
  });
  return true;
}

const trainerStore = createValueStore<Trainer | null>(
  STORAGE_KEYS.trainer,
  trainerSchema.nullable(),
  null,
);

export function useGymProgress() {
  const stats = useSyncExternalStore(
    statsStore.subscribe,
    statsStore.getSnapshot,
    statsStore.getServerSnapshot,
  );
  const achievements = useSyncExternalStore(
    achievementStore.subscribe,
    achievementStore.getSnapshot,
    achievementStore.getServerSnapshot,
  );
  const daily = useSyncExternalStore(
    dailyStore.subscribe,
    dailyStore.getSnapshot,
    dailyStore.getServerSnapshot,
  );
  const bag = useSyncExternalStore(
    bagStore.subscribe,
    bagStore.getSnapshot,
    bagStore.getServerSnapshot,
  );
  const played = useSyncExternalStore(
    playedStore.subscribe,
    playedStore.getSnapshot,
    playedStore.getServerSnapshot,
  );
  const days = useMemo(() => playedDays(daily, played), [daily, played]);
  return { stats, achievements, daily, bag, days };
}

/**
 * Marks `date` as played (any daily game). Returns the streak when this completes a Master Ball
 * bonus (and adds the ball), else undefined. A day already played changes nothing.
 */
function markPlayed(date: string): number | undefined {
  const before = playedDays(dailyStore.getSnapshot(), playedStore.getSnapshot());
  if (before.some((d) => d.date === date)) return undefined;
  playedStore.set([...playedStore.getSnapshot(), date].sort().slice(-DAILY_HISTORY * 2));
  const after = playedDays(dailyStore.getSnapshot(), playedStore.getSnapshot());
  return streakBonus(before, after, date);
}

/**
 * Folds a finished daily quiz into the progress: the day counts for the streak, a solve gives XP and
 * a Pokéball, a first-guess solve unlocks "Olho de treinador". Called once, when the day ends.
 */
export function recordQuizDay(
  date: string,
  ball: Ball | undefined,
  firstGuess: boolean,
): { streakBonus?: number; unlocked: AchievementId[] } {
  const bonus = markPlayed(date);
  let stats = statsStore.getSnapshot();
  if (ball) {
    recordMission("quiz", 1);
    stats = {
      ...stats,
      quizSolved: stats.quizSolved + 1,
      balls: { ...stats.balls, [ball]: stats.balls[ball] + 1 },
    };
  }
  if (bonus) stats = addStreakBall(stats);
  statsStore.set(stats);
  const unlocked: AchievementId[] = [];
  if (firstGuess && achievementStore.add("sharp-eye")) unlocked.push("sharp-eye");
  if (bonus && achievementStore.add("master-ball")) unlocked.push("master-ball");
  return bonus ? { streakBonus: bonus, unlocked } : { unlocked };
}

/** Uses a Master Ball for a legendary encounter. Returns false when there is none. */
export function takeMasterBall(): boolean {
  const stats = statsStore.getSnapshot();
  if (stats.balls.master <= 0) return false;
  statsStore.set(spendMasterBall(stats));
  return true;
}

/** Records the legendary picked in an encounter (the Master Ball always catches). */
export function recordCatch(name: string): LegendarySet[] {
  const { stats, completed } = catchAndComplete(statsStore.getSnapshot(), name);
  statsStore.set(stats);
  if (completed.length > 0) achievementStore.add("legend-set");
  return completed;
}

/**
 * Folds a finished run into stats, achievements, the daily results and the bag. Called once, from
 * the event handler that produces the final outcome, so reloads never count a run twice. Practice
 * runs change nothing. Returns the achievements unlocked for the first time.
 */
export function recordFinishedRun(
  run: GymRun,
  pool: readonly BattlePokemon[],
): { unlocked: AchievementId[]; streakBonus?: number } {
  // Practice runs still show up in the history (flagged), but change nothing else.
  historyStore.set(addToHistory(historyStore.getSnapshot(), run, new Date().toISOString()));
  if (run.practice) return { unlocked: [] };
  const map = new Map(pool.map((p) => [p.name, p.id]));
  const idsOf = (names: readonly string[]) => names.flatMap((name) => map.get(name) ?? []);
  markDex({
    used: idsOf(run.picks),
    seen: idsOf(run.history.flatMap((record) => record.opponent)),
  });
  recordMission("battles", battlesWon(run));
  if (run.phase === "won" && run.mode !== "daily") recordMission("badge", 1);
  recordMission("evolve", run.evolved.length);
  let stats = recordRun(statsStore.getSnapshot(), run);
  const bonus = recordDailyWithStreak(run);
  if (bonus) stats = addStreakBall(stats);
  statsStore.set(stats);
  bagStore.set(addDailyItem(bagStore.getSnapshot(), run));
  const before = new Set(achievementStore.getSnapshot());
  const unlocked = achievementsFor(run, pool, stats).filter((id) => {
    if (before.has(id)) return false;
    achievementStore.add(id);
    return true;
  });
  return bonus ? { unlocked, streakBonus: bonus } : { unlocked };
}

export interface RocketOutcome {
  ball?: Ball;
  /** The day's item (a win only). */
  item?: string;
  streakBonus?: number;
  unlocked: AchievementId[];
}

/**
 * Saves an official attempt at today's ambush. The first attempt counts the day for the streak;
 * the attempt that closes the day (a win, or the last miss) pays out: a ball by attempt, the day's
 * item and "Decolando de novo" for a win. Returns the day and what was earned now.
 */
export function recordRocketAttempt(
  date: string,
  attempt: RocketAttempt,
): { day: RocketDay | undefined; outcome: RocketOutcome } {
  const next = addAttempt(rocketStore.getSnapshot(), date, attempt);
  rocketStore.set(next);
  const day = next.days.find((d) => d.date === date);
  const bonus = markPlayed(date);
  let stats = statsStore.getSnapshot();
  const unlocked: AchievementId[] = [];
  const outcome: RocketOutcome = { unlocked };
  if (bonus) {
    stats = addStreakBall(stats);
    outcome.streakBonus = bonus;
    if (achievementStore.add("master-ball")) unlocked.push("master-ball");
  }
  if (day?.result) {
    const won = day.result === "won";
    const ball = rocketReward(day.attempts.length, won);
    stats = {
      ...stats,
      cleared: { ...stats.cleared, daily: stats.cleared.daily + (won ? 1 : 0) },
      balls: ball ? { ...stats.balls, [ball]: stats.balls[ball] + 1 } : stats.balls,
    };
    if (ball) outcome.ball = ball;
    if (won) {
      recordMission("ambush", 1);
      const item = dailyItem(date);
      const bag = bagStore.getSnapshot();
      bagStore.set({ ...bag, [item]: (bag[item] ?? 0) + 1 });
      outcome.item = item;
      if (achievementStore.add("daily-badge")) unlocked.push("daily-badge");
      if (achievementStore.add("first-win")) unlocked.push("first-win");
    }
  }
  statsStore.set(stats);
  return { day, outcome };
}

/** Records a daily attempt; returns the streak when it completes a Master Ball bonus. */
function recordDailyWithStreak(run: GymRun): number | undefined {
  if (!run.daily || run.practice) return undefined;
  const bonus = markPlayed(run.daily);
  dailyStore.set(recordDaily(dailyStore.getSnapshot(), run));
  return bonus;
}

/** A clock that ticks once per second (only while something is subscribed). */
function subscribeClock(listener: () => void) {
  const timer = window.setInterval(listener, 1000);
  return () => window.clearInterval(timer);
}
const nowInSeconds = () => Math.floor(Date.now() / 1000);

/**
 * Today's local date key and the seconds until the next daily challenge (local midnight). Both are
 * empty during SSR: the server doesn't know the player's timezone.
 */
export function useToday() {
  const now = useSyncExternalStore(subscribeClock, nowInSeconds, () => 0);
  if (now === 0) return { today: "", secondsLeft: 0 };
  const date = new Date(now * 1000);
  const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return {
    today: dailyKey(date),
    secondsLeft: Math.max(0, Math.round((midnight.getTime() - date.getTime()) / 1000)),
  };
}

/** Abandoning the daily challenge still uses up the day's attempt (no free retries). */
export function recordAbandonedDaily(run: GymRun) {
  if (run.practice) return;
  // Abandoning still counts as playing the day, streak included.
  if (recordDailyWithStreak({ ...run, phase: "lost" })) {
    statsStore.set(addStreakBall(statsStore.getSnapshot()));
  }
}

export function useGymHistory() {
  return useSyncExternalStore(
    historyStore.subscribe,
    historyStore.getSnapshot,
    historyStore.getServerSnapshot,
  );
}

/** The player's trainer (name, ID, since), or null before they pick a name. No login involved. */
export function useTrainer() {
  const trainer = useSyncExternalStore(
    trainerStore.subscribe,
    trainerStore.getSnapshot,
    trainerStore.getServerSnapshot,
  );
  function rename(name: string) {
    const clean = cleanTrainerName(name);
    if (!clean) return;
    const current = trainerStore.getSnapshot();
    trainerStore.set({
      name: clean,
      id: current?.id ?? String(Math.floor(Math.random() * 100_000)).padStart(5, "0"),
      since: current?.since ?? dailyKey(new Date()),
      ...(current?.partner ? { partner: current.partner } : {}),
    });
  }
  /** Picks a favorite as the card's partner (undefined: the most used). Needs a named trainer. */
  function setPartner(partner: string | undefined) {
    const current = trainerStore.getSnapshot();
    if (!current) return;
    const next = { ...current, partner };
    if (!partner) delete next.partner;
    trainerStore.set(next);
  }
  return { trainer, rename, setPartner };
}

// ---- Focus: while a run or a battle is on screen, the gym's own tabs step aside ----

let focused = false;
const focusListeners = new Set<() => void>();

function subscribeFocus(listener: () => void) {
  focusListeners.add(listener);
  return () => {
    focusListeners.delete(listener);
  };
}

/** Set by the game: true while drafting, before a battle or during one. Not persisted. */
export function setGymFocus(value: boolean) {
  if (focused === value) return;
  focused = value;
  focusListeners.forEach((listener) => listener());
}

export function useGymFocus() {
  return useSyncExternalStore(
    subscribeFocus,
    () => focused,
    () => false,
  );
}

/**
 * Wipes the game's progress in this browser: the run, badges, balls, bag, legendaries, achievements,
 * stats, history, daily results, the trainer and the first-run tips. Favorites, the team, theme,
 * sound and speed are the Pokédex's and the player's settings: they stay.
 */
export function resetGymProgress() {
  runStore.set(null);
  badgeStore.clear();
  statsStore.set(EMPTY_STATS);
  achievementStore.clear();
  dailyStore.set(NO_DAILY);
  bagStore.set(EMPTY_BAG);
  historyStore.set(NO_HISTORY);
  trainerStore.set(null);
  tipStore.clear();
  playedStore.set(NO_DAYS);
  rocketStore.set(EMPTY_ROCKET);
  missionStore.set(null);
  resetQuiz();
  resetDex();
}

/** Spends one of a bag item (using it in a run). Returns false when there is none. */
export function spendItem(name: string): boolean {
  const bag = bagStore.getSnapshot();
  if ((bag[name] ?? 0) <= 0) return false;
  bagStore.set({ ...bag, [name]: (bag[name] ?? 0) - 1 });
  return true;
}

/** Adds an item to the bag (a reward between battles). */
export function addItem(name: string) {
  const bag = bagStore.getSnapshot();
  bagStore.set({ ...bag, [name]: (bag[name] ?? 0) + 1 });
}
