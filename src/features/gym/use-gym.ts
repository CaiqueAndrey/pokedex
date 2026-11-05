"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";
import type { AchievementId, BattleSpeed } from "@/config/gym";
import {
  EMPTY_STATS,
  achievementsFor,
  addDailyItem,
  addStreakBall,
  addToHistory,
  bagSchema,
  cleanTrainerName,
  catchLegendary,
  dailyKey,
  dailyResultsSchema,
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
import { gymRunSchema, type GymRun } from "@/lib/battle/run";
import type { TuneName } from "@/lib/sound/tunes";
import type { BattlePokemon } from "@/types/battle";
import { createListStore } from "@/lib/list-store";
import { STORAGE_KEYS } from "@/lib/storage";
import { createValueStore } from "@/lib/value-store";
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
  return { stats, achievements, daily, bag };
}

/** Uses a Master Ball for a legendary encounter. Returns false when there is none. */
export function takeMasterBall(): boolean {
  const stats = statsStore.getSnapshot();
  if (stats.balls.master <= 0) return false;
  statsStore.set(spendMasterBall(stats));
  return true;
}

/** Records the legendary picked in an encounter (the Master Ball always catches). */
export function recordCatch(name: string) {
  statsStore.set(catchLegendary(statsStore.getSnapshot(), name));
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

/** Records a daily attempt; returns the streak when it completes a Master Ball bonus. */
function recordDailyWithStreak(run: GymRun): number | undefined {
  if (!run.daily) return undefined;
  const before = dailyStore.getSnapshot();
  const after = recordDaily(before, run);
  dailyStore.set(after);
  return streakBonus(before, after, run.daily);
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
    });
  }
  return { trainer, rename };
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
}
