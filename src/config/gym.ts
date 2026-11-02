/** Pewter Gym content and game rules (project-goal.md §8.8). Tune balance here, not in the engine. */

/** Last national-dex number of each generation. */
export const LAST_SPECIES_ID_BY_GENERATION = [
  151, 251, 386, 493, 649, 721, 809, 905, 1025,
] as const;

/** Generations in the draft pool (legendaries and mythicals are always excluded). */
export const POOL_GENERATIONS = [1, 2, 3, 4] as const;

export const TEAM_SIZE = 6;
export const DRAFT_ROUNDS = TEAM_SIZE;
export const OFFERS_PER_ROUND = 3;
export const REROLLS_PER_RUN = 1;

/**
 * Per-mode budgets (base stat totals). The player's cap sits well below "six strong picks", so
 * every strong pick early costs a weaker one later. Opponents get a fixed budget (scaled per
 * battle, not relative to the player's team), so drafting well is a real advantage.
 *
 * Tuned with 250 simulated runs per row (docs/phases/08-gym-mode.md):
 *   easy: random picks ~34% badge, always-strongest-that-fits ~76%
 *   hard: random picks ~4% badge, always-strongest-that-fits ~22%
 */
export const MODE_BUDGETS = {
  easy: { player: 2700, opponents: 2400 },
  hard: { player: 2500, opponents: 2600 },
} as const;

/** Default player budget (easy). */
export const TEAM_BUDGET = MODE_BUDGETS.easy.player;

export const BATTLE_LEVEL = 50;
export const MOVE_POWER = 60;
export const STAB = 1.5;
export const CRITICAL_CHANCE = 1 / 24;
export const CRITICAL_MULTIPLIER = 1.5;
/** Safety net: a battle never runs longer than this many attacks. */
export const MAX_ATTACKS = 500;

export interface GymBattle {
  trainer: string;
  /** Opponent budget as a fraction of the mode's opponent budget. */
  budgetFactor: number;
  leader?: boolean;
}

export const GYM = {
  id: "boulder",
  city: "Pewter",
  leader: "Brock",
  badge: "Insígnia da Rocha",
  battles: [
    { trainer: "Campista Liam", budgetFactor: 0.85 },
    { trainer: "Montanhista Rui", budgetFactor: 0.9 },
    { trainer: "Escoteira Lia", budgetFactor: 0.95 },
    { trainer: "Treinador Davi", budgetFactor: 1.0 },
    { trainer: "Brock", budgetFactor: 1.05, leader: true },
  ] satisfies GymBattle[],
} as const;

/** Milliseconds per battle event for each speed setting. */
export const BATTLE_SPEEDS = { slow: 1500, medium: 850, fast: 300 } as const;
export type BattleSpeed = keyof typeof BATTLE_SPEEDS;
