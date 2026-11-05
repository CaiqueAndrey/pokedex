import { z } from "zod";
import { hashString } from "./battle/rng";

/**
 * Weekly missions: three goals per ISO week, the same for everyone (drawn from the week key), with
 * progress fed by the games (gym runs, the quiz, the ambush). Pure; the UI persists the state.
 */

export const MISSIONS = {
  battles: { target: 8 },
  badge: { target: 1 },
  quiz: { target: 3 },
  ambush: { target: 2 },
  evolve: { target: 2 },
  endless: { target: 5 },
} as const;
export type MissionId = keyof typeof MISSIONS;
export const MISSION_IDS = Object.keys(MISSIONS) as MissionId[];
/** Missions per week. */
export const WEEKLY_MISSIONS = 3;

/** ISO week of a local date, e.g. "2026-W45" (weeks start on Monday). */
export function weekKey(date: Date): string {
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((day.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** The week's missions, in a stable order. */
export function weeklyMissions(week: string): MissionId[] {
  return [...MISSION_IDS]
    .sort((a, b) => hashString(`${week}|${a}`) - hashString(`${week}|${b}`))
    .slice(0, WEEKLY_MISSIONS);
}

const count = z.number().int().min(0);
export const missionStateSchema = z.object({
  week: z.string().regex(/^\d{4}-W\d{2}$/),
  progress: z.record(z.string(), count),
  claimed: z.array(z.string()),
});
export type MissionState = z.infer<typeof missionStateSchema>;

/** The state for `week`: a new week starts from zero. */
export const forWeek = (state: MissionState | null, week: string): MissionState =>
  state?.week === week ? state : { week, progress: {}, claimed: [] };

/**
 * Feeds an event to the week's missions: `add` sums (battles won), `max` keeps the best (an endless
 * streak). Missions not drawn this week ignore it.
 */
export function addProgress(
  state: MissionState | null,
  week: string,
  id: MissionId,
  amount: number,
  how: "add" | "max" = "add",
): MissionState {
  const current = forWeek(state, week);
  if (!weeklyMissions(week).includes(id) || amount <= 0) return current;
  const before = current.progress[id] ?? 0;
  const value = how === "add" ? before + amount : Math.max(before, amount);
  return {
    ...current,
    progress: { ...current.progress, [id]: Math.min(value, MISSIONS[id].target) },
  };
}

export const missionDone = (state: MissionState, id: MissionId) =>
  (state.progress[id] ?? 0) >= MISSIONS[id].target;

/** Claims a finished mission (once). Returns the same state when it can't be claimed. */
export function claimMission(state: MissionState, id: MissionId): MissionState {
  if (!missionDone(state, id) || state.claimed.includes(id)) return state;
  return { ...state, claimed: [...state.claimed, id] };
}
