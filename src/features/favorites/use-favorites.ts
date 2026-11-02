"use client";

import { useSyncExternalStore } from "react";
import { createListStore } from "@/lib/list-store";
import { STORAGE_KEYS } from "@/lib/storage";

const store = createListStore(STORAGE_KEYS.favorites);

export function useFavorites() {
  const names = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return { names, has: (name: string) => names.includes(name), toggle: store.toggle };
}
