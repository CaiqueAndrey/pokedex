import { nameListSchema, readStorage, writeStorage } from "./storage";

const EMPTY: string[] = [];

/**
 * A tiny external store over a localStorage name list, shaped for `useSyncExternalStore`:
 * snapshots are referentially stable and the server snapshot is always empty, so hydration matches.
 */
export function createListStore(key: string, max = Number.POSITIVE_INFINITY) {
  let cache: string[] | undefined;
  const listeners = new Set<() => void>();

  const getSnapshot = (): string[] => (cache ??= readStorage(key, nameListSchema, EMPTY));
  const getServerSnapshot = (): string[] => EMPTY;

  function write(next: string[]) {
    cache = next;
    writeStorage(key, next);
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

  return {
    subscribe,
    getSnapshot,
    getServerSnapshot,
    max,
    add(name: string) {
      const current = getSnapshot();
      if (current.includes(name) || current.length >= max) return false;
      write([...current, name]);
      return true;
    },
    remove(name: string) {
      write(getSnapshot().filter((item) => item !== name));
    },
    toggle(name: string) {
      const current = getSnapshot();
      if (current.includes(name)) write(current.filter((item) => item !== name));
      else if (current.length < max) write([...current, name]);
    },
    clear() {
      write([]);
    },
  };
}
