import type { z } from "zod";
import { readStorage, writeStorage } from "./storage";

/**
 * Like `createListStore`, but for any Zod-validated value (e.g. the gym run). Shaped for
 * `useSyncExternalStore`: stable snapshots, a fixed server snapshot, cross-tab sync.
 */
export function createValueStore<T>(key: string, schema: z.ZodType<T>, fallback: T) {
  let cache: { value: T } | undefined;
  const listeners = new Set<() => void>();

  const getSnapshot = (): T => (cache ??= { value: readStorage(key, schema, fallback) }).value;
  const getServerSnapshot = (): T => fallback;

  function set(value: T) {
    cache = { value };
    if (value === fallback) window.localStorage.removeItem(key);
    else writeStorage(key, value);
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      cache = undefined;
      listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  return { subscribe, getSnapshot, getServerSnapshot, set };
}
