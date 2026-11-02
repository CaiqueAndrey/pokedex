"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";
import type { BattleSpeed } from "@/config/gym";
import { gymRunSchema, type GymRun } from "@/lib/battle/run";
import { createListStore } from "@/lib/list-store";
import { STORAGE_KEYS } from "@/lib/storage";
import { createValueStore } from "@/lib/value-store";

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
