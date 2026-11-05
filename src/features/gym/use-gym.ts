"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";
import type { AchievementId, BattleSpeed } from "@/config/gym";
import {
  EMPTY_STATS,
  achievementsFor,
  dailyKey,
  dailyResultsSchema,
  gymStatsSchema,
  recordDaily,
  recordRun,
  type DailyResult,
  type GymStats,
} from "@/lib/battle/progress";
import { gymRunSchema, type GymRun } from "@/lib/battle/run";
import type { TuneName } from "@/lib/sound/tunes";
import type { BattlePokemon } from "@/types/battle";
import { createListStore } from "@/lib/list-store";
import { STORAGE_KEYS } from "@/lib/storage";
import { createValueStore } from "@/lib/value-store";
import { playTune, vibrate } from "./sound";

const NO_DAILY: DailyResult[] = [];

const runStore = createValueStore<GymRun | null>(
  STORAGE_KEYS.gymRun,
  gymRunSchema.nullable(),
  null,
);
const badgeStore = createListStore(STORAGE_KEYS.badges);

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
  return { stats, achievements, daily };
}

/**
 * Folds a finished run into stats, achievements and the daily results. Called once, from the
 * event handler that produces the final outcome, so reloads never count a run twice.
 * Returns the achievements unlocked for the first time.
 */
export function recordFinishedRun(run: GymRun, pool: readonly BattlePokemon[]): AchievementId[] {
  const stats = recordRun(statsStore.getSnapshot(), run);
  statsStore.set(stats);
  dailyStore.set(recordDaily(dailyStore.getSnapshot(), run));
  const before = new Set(achievementStore.getSnapshot());
  return achievementsFor(run, pool, stats).filter((id) => {
    if (before.has(id)) return false;
    achievementStore.add(id);
    return true;
  });
}

const subscribeNever = () => () => {};

/** Today's local date key, or "" during SSR (the server doesn't know the player's timezone). */
export function useToday() {
  return useSyncExternalStore(
    subscribeNever,
    () => dailyKey(new Date()),
    () => "",
  );
}

/** Abandoning the daily challenge still uses up the day's attempt (no free retries). */
export function recordAbandonedDaily(run: GymRun) {
  dailyStore.set(recordDaily(dailyStore.getSnapshot(), { ...run, phase: "lost" }));
}
