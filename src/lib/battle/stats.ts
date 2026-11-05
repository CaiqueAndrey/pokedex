import type { BattleResult, Side } from "@/types/battle";

export interface FighterStats {
  /** Damage dealt (capped at the HP the defender had left, so overkill doesn't count). */
  damage: number;
  knockouts: number;
}

/** Damage and knockouts per team member of `side`, in team order. Pure: read from the event log. */
export function battleStats(result: BattleResult, side: Side): FighterStats[] {
  const target: Side = side === "player" ? "opponent" : "player";
  const stats = result.maxHp[side].map(() => ({ damage: 0, knockouts: 0 }));
  const hp = [...result.maxHp[target]];
  for (const event of result.events) {
    if (event.kind !== "attack" || event.side !== side) continue;
    const entry = stats[event.attacker];
    if (!entry) continue;
    entry.damage += (hp[event.defender] ?? 0) - event.hpLeft;
    hp[event.defender] = event.hpLeft;
    if (event.hpLeft === 0) entry.knockouts++;
  }
  return stats;
}

/**
 * The team member who did the most (damage, then knockouts; ties go to the earlier one), or
 * undefined when nobody did anything.
 */
export function mvpIndex(stats: readonly FighterStats[]): number | undefined {
  let best: number | undefined;
  stats.forEach((entry, index) => {
    if (entry.damage === 0 && entry.knockouts === 0) return;
    const current = best === undefined ? undefined : stats[best];
    if (
      !current ||
      entry.damage > current.damage ||
      (entry.damage === current.damage && entry.knockouts > current.knockouts)
    )
      best = index;
  });
  return best;
}

/** Sums per-battle damage maps (name → damage) and returns the top name, if any. */
export function topDamage(maps: readonly Record<string, number>[]): string | undefined {
  const totals = new Map<string, number>();
  for (const map of maps) {
    for (const [name, damage] of Object.entries(map)) {
      totals.set(name, (totals.get(name) ?? 0) + damage);
    }
  }
  let best: [string, number] | undefined;
  for (const entry of totals) if (entry[1] > 0 && (!best || entry[1] > best[1])) best = entry;
  return best?.[0];
}
