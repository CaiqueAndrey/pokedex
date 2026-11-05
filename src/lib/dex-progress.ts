import { z } from "zod";
import { LAST_SPECIES_ID_BY_GENERATION } from "@/config/gym";

/**
 * Your Pokédex: species **seen** (faced in a battle, revealed by the quiz) and **used** (on your team
 * in a gym run or the ambush), by national number. Using one also counts as seeing it.
 */

const ids = z.array(z.number().int().min(1).max(1025)).max(1025);
export const dexProgressSchema = z.object({ seen: ids, used: ids });
export type DexProgress = z.infer<typeof dexProgressSchema>;
export const EMPTY_DEX: DexProgress = { seen: [], used: [] };

const merge = (list: readonly number[], add: readonly number[]) =>
  [...new Set([...list, ...add])].filter((id) => id >= 1 && id <= 1025).sort((a, b) => a - b);

export function markSpecies(
  state: DexProgress,
  { seen = [], used = [] }: { seen?: readonly number[]; used?: readonly number[] },
): DexProgress {
  return { seen: merge(state.seen, [...seen, ...used]), used: merge(state.used, used) };
}

/** National number → generation (1–9), from the last number of each generation. */
export function generationOf(id: number): number {
  const index = LAST_SPECIES_ID_BY_GENERATION.findIndex((last) => id <= last);
  return index < 0 ? LAST_SPECIES_ID_BY_GENERATION.length : index + 1;
}

/** Seen, used and total per generation (for the progress bars). */
export function progressByGeneration(state: DexProgress) {
  return LAST_SPECIES_ID_BY_GENERATION.map((last, index) => {
    const first = index === 0 ? 1 : (LAST_SPECIES_ID_BY_GENERATION[index - 1] ?? 0) + 1;
    const inRange = (id: number) => id >= first && id <= last;
    return {
      generation: index + 1,
      total: last - first + 1,
      seen: state.seen.filter(inRange).length,
      used: state.used.filter(inRange).length,
    };
  });
}
