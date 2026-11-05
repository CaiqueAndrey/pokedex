"use client";

import { useSyncExternalStore } from "react";
import { EMPTY_DEX, dexProgressSchema, markSpecies } from "@/lib/dex-progress";
import { STORAGE_KEYS } from "@/lib/storage";
import { createValueStore } from "@/lib/value-store";

const dexStore = createValueStore(STORAGE_KEYS.dexProgress, dexProgressSchema, EMPTY_DEX);

/** Species you've seen and used in the games (national numbers). */
export function useDexProgress() {
  return useSyncExternalStore(dexStore.subscribe, dexStore.getSnapshot, dexStore.getServerSnapshot);
}

/** Records species seen (faced, revealed) and used (on your team). Safe to call from any handler. */
export function markDex(change: { seen?: readonly number[]; used?: readonly number[] }) {
  dexStore.set(markSpecies(dexStore.getSnapshot(), change));
}

export function resetDex() {
  dexStore.set(EMPTY_DEX);
}
