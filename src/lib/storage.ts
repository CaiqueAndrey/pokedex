import { z } from "zod";

/** Reads a Zod-validated value from localStorage. Missing or corrupt data yields `fallback`. */
export function readStorage<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be full or blocked (private mode): the app keeps working without persistence.
  }
}

/** Keys carry a version suffix so a future shape change can ignore old data safely. */
export const STORAGE_KEYS = {
  favorites: "pokedex:favorites:v1",
  team: "pokedex:team:v1",
  theme: "pokedex:theme:v1",
  gymRun: "pokedex:gym-run:v1",
  badges: "pokedex:badges:v1",
  battleSpeed: "pokedex:battle-speed:v1",
  sound: "pokedex:sound:v1",
  gymStats: "pokedex:gym-stats:v1",
  achievements: "pokedex:achievements:v1",
  gymDaily: "pokedex:gym-daily:v1",
  gymBag: "pokedex:gym-bag:v1",
} as const;

export const nameListSchema = z.array(z.string().min(1).max(80)).max(2000);
