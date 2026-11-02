"use client";

import { useSyncExternalStore } from "react";
import { createListStore } from "@/lib/list-store";
import { STORAGE_KEYS } from "@/lib/storage";

export const TEAM_SIZE = 6;
const store = createListStore(STORAGE_KEYS.team, TEAM_SIZE);

export function useTeam() {
  const names = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return {
    names,
    has: (name: string) => names.includes(name),
    full: names.length >= TEAM_SIZE,
    add: store.add,
    remove: store.remove,
    toggle: store.toggle,
    clear: store.clear,
  };
}
