import { z } from "zod";
import {
  GYMS,
  HAND_SIZE,
  MAX_BATTLES,
  REROLLS_PER_RUN,
  RULES_VERSION,
  TEAM_SIZE,
  TRAINER_NAMES,
  type GymMode,
} from "@/config/gym";
import type { BattlePokemon, BattleResult } from "@/types/battle";
import type { TypeRelations } from "@/types/pokemon";
import { drawHand, draftRound, legendaryRound, type DraftRound } from "./draft";
import { levelStats } from "./damage";
import { counterPick, generateOpponent } from "./opponents";
import { pick, rngFrom, shuffle } from "./rng";
import { simulateBattle } from "./simulate";
import { battleStats, mvpIndex } from "./stats";
import { teamBst, validateTeam } from "./team";

/**
 * A gym run is a small state machine. Everything random is derived from the seed plus what the
 * player did, so the run is reproducible and safe to persist in localStorage:
 *
 *   draft (6 picks) → ready (battle n) → … → won | lost
 */
export const battleRecordSchema = z.object({
  battle: z.number().int().min(0),
  won: z.boolean(),
  /** Team order used (names). */
  order: z.array(z.string()),
  /** Opponent team (names, in order). */
  opponent: z.array(z.string()),
  /** Player Pokémon still standing at the end. */
  remaining: z.number().int().min(0),
  /** Opponent Pokémon still standing at the end. */
  opponentRemaining: z.number().int().min(0),
  /** Damage dealt by each of your Pokémon (name → damage): the battle's MVP comes from here. */
  damage: z.record(z.string(), z.number().int().min(0)).default({}),
  /** The opponent's Pokémon that dealt the most damage to your team. */
  opponentMvp: z.string().optional(),
});

export type BattleRecord = z.infer<typeof battleRecordSchema>;
export type { GymMode };

export const gymRunSchema = z.object({
  /** Rules version the run was started under (`RULES_VERSION`); v1 runs had none. */
  rules: z.number().int().min(1).default(1),
  /** Set for the daily challenge: the local date (YYYY-MM-DD) whose seed the run uses. */
  daily: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  seed: z.string().min(1).max(40),
  picks: z.array(z.string()).max(TEAM_SIZE),
  rerollsUsed: z.number().int().min(0).max(REROLLS_PER_RUN),
  /** Team order chosen before the next battle (names). */
  order: z.array(z.string()).max(TEAM_SIZE),
  /** Index of the next battle (0-based). */
  battle: z.number().int().min(0).max(MAX_BATTLES),
  phase: z.enum(["draft", "ready", "won", "lost"]),
  /** Easy = Pewter (Brock), hard = Cerulean (Misty), daily = Team Rocket. */
  mode: z.enum(["easy", "hard", "daily"]).default("easy"),
  /** One entry per battle fought in this run (a new run starts empty). */
  history: z.array(battleRecordSchema).max(MAX_BATTLES).default([]),
  /** Gauntlet: current HP by name (carried between battles). Missing = full. */
  hp: z.record(z.string(), z.number().int().min(0)).default({}),
  /** A Master Ball was spent: the first draft round is a legendary encounter. */
  legendary: z.boolean().default(false),
  /** Practice: replays a seed (e.g. a past daily) without stats, rewards or daily results. */
  practice: z.boolean().default(false),
});

export type GymRun = z.infer<typeof gymRunSchema>;

export interface StartOptions {
  /** The daily challenge's date (YYYY-MM-DD). */
  daily?: string;
  legendary?: boolean;
  practice?: boolean;
}

export function startRun(
  seed: string,
  mode: GymMode = "easy",
  { daily, legendary = false, practice = false }: StartOptions = {},
): GymRun {
  return {
    rules: RULES_VERSION,
    ...(daily ? { daily } : {}),
    legendary,
    practice,
    hp: {},
    seed,
    picks: [],
    rerollsUsed: 0,
    order: [],
    battle: 0,
    phase: "draft",
    mode,
    history: [],
  };
}

export function byName(pool: readonly BattlePokemon[]) {
  return new Map(pool.map((p) => [p.name, p]));
}

function resolve(names: readonly string[], pool: readonly BattlePokemon[]): BattlePokemon[] {
  const map = byName(pool);
  return names.flatMap((name) => map.get(name) ?? []);
}

export const playerTeam = (run: GymRun, pool: readonly BattlePokemon[]) =>
  resolve(run.order.length === run.picks.length ? run.order : run.picks, pool);

export function currentDraft(run: GymRun, pool: readonly BattlePokemon[]): DraftRound {
  const rng = rngFrom(run.seed, "draft", run.picks.length, run.rerollsUsed);
  const budget = GYMS[run.mode].rules.player;
  const team = resolve(run.picks, pool);
  return run.legendary && run.picks.length === 0
    ? legendaryRound(pool, team, rng, budget)
    : draftRound(pool, team, rng, budget);
}

export function pickPokemon(run: GymRun, name: string, pool: readonly BattlePokemon[]): GymRun {
  if (run.phase !== "draft") return run;
  const round = currentDraft(run, pool);
  if (!round.offers.some((offer) => offer.name === name) || round.blocked.includes(name))
    return run;
  const picks = [...run.picks, name];
  const done = picks.length === TEAM_SIZE;
  return { ...run, picks, order: done ? picks : [], phase: done ? "ready" : "draft" };
}

/** Battles in this run's mode (5 in a gym, up to 10 in the gauntlet). */
export const battleCount = (run: Pick<GymRun, "mode">) => GYMS[run.mode].battles.length;
export const isGauntlet = (run: Pick<GymRun, "mode">) => GYMS[run.mode].format === "gauntlet";

/** The gauntlet's hand: the same 12 for everyone with the same seed. */
export const handFor = (run: Pick<GymRun, "seed">, pool: readonly BattlePokemon[]) =>
  drawHand(pool, rngFrom(run.seed, "hand"), HAND_SIZE);

/** Gauntlet draft: six from the hand, under the cap, in one go. Invalid picks are ignored. */
export function pickHand(run: GymRun, names: readonly string[], pool: readonly BattlePokemon[]) {
  if (run.phase !== "draft" || !isGauntlet(run)) return run;
  const hand = new Map(handFor(run, pool).map((p) => [p.name, p]));
  const team = names.flatMap((name) => hand.get(name) ?? []);
  const cap = GYMS[run.mode].rules.player;
  if (team.length !== names.length || validateTeam(team).length > 0) return run;
  if (cap !== null && teamBst(team) > cap) return run;
  const picks = team.map((p) => p.name);
  return { ...run, picks, order: picks, phase: "ready" as const };
}

/** Current HP of each team member, in team order (full when not tracked). */
export function teamHp(run: GymRun, pool: readonly BattlePokemon[]): number[] {
  return playerTeam(run, pool).map((p) => run.hp[p.name] ?? levelStats(p.stats).hp);
}

export function reroll(run: GymRun): GymRun {
  if (run.phase !== "draft" || run.rerollsUsed >= REROLLS_PER_RUN) return run;
  return { ...run, rerollsUsed: run.rerollsUsed + 1 };
}

export function reorder(run: GymRun, order: string[]): GymRun {
  const same = order.length === run.picks.length && order.every((name) => run.picks.includes(name));
  return same && run.phase === "ready" ? { ...run, order } : run;
}

export const gymOf = (run: Pick<GymRun, "mode">) => GYMS[run.mode];
export const battleConfig = (run: Pick<GymRun, "mode">, battle: number) =>
  GYMS[run.mode].battles[battle];

/**
 * Trainer names for the run's five battles: fixed for leaders and bosses, otherwise a class plus a
 * first name drawn from the seed, so every run meets different trainers (never the same name twice).
 */
export function trainersFor(run: Pick<GymRun, "mode" | "seed">): string[] {
  const rng = rngFrom(run.seed, "trainers");
  const names = shuffle(rng, TRAINER_NAMES);
  return GYMS[run.mode].battles.map((battle, index) => {
    if (battle.trainer) return battle.trainer;
    const kind = pick(rng, battle.classes ?? []) ?? "Treinador";
    return `${kind} ${names[index % names.length] ?? ""}`.trim();
  });
}

export const trainerFor = (run: Pick<GymRun, "mode" | "seed">, battle: number) =>
  trainersFor(run)[battle] ?? "";

/**
 * The opponent's budget for a battle: the mode's base, moved `follow` of the way towards the
 * player's team strength, then scaled by the battle's factor (the curve up to the leader).
 */
export function opponentBudget(run: GymRun, battle: number, pool: readonly BattlePokemon[]) {
  const config = battleConfig(run, battle);
  if (!config) return 0;
  const rules = gymOf(run).rules;
  const team = teamBst(resolve(run.picks, pool));
  const base = rules.opponents + rules.follow * (team - rules.opponents);
  // Budgets are for six: smaller teams (Team Rocket grunts) get their share.
  const share = (config.teamSize ?? TEAM_SIZE) / TEAM_SIZE;
  return Math.round(base * config.budgetFactor * share);
}

/** Whether this battle's trainer picks its lead after seeing yours (by mode; leaders and bosses always). */
export function countersLead(run: Pick<GymRun, "mode">, battle: number) {
  const config = battleConfig(run, battle);
  return gymOf(run).rules.counterPick || Boolean(config?.leader || config?.signature);
}

/** Generated rosters per run (seed + mode + picks): pure inputs, so caching is safe. */
const rosterCache = new Map<string, BattlePokemon[][]>();
const ROSTER_CACHE_SIZE = 20;

/**
 * Every trainer's team for the run, in battle order. Each trainer avoids the families earlier
 * trainers fielded (signatures aside), so the run doesn't meet the same counter five times.
 */
export function opponentRosters(
  run: GymRun,
  pool: readonly BattlePokemon[],
  relations: TypeRelations,
): BattlePokemon[][] {
  const key = `${run.mode}|${run.seed}|${run.picks.join(",")}|${pool.length}`;
  const cached = rosterCache.get(key);
  if (cached) return cached;
  const picks = resolve(run.picks, pool);
  const used = new Set<number>();
  const rosters = gymOf(run).battles.map((config, battle) => {
    const signature = config.signature ? resolve([config.signature], pool) : [];
    const team = generateOpponent(
      pool,
      opponentBudget(run, battle, pool),
      rngFrom(run.seed, "opponent", battle),
      config.teamSize ?? TEAM_SIZE,
      {
        signature,
        scouting: { team: picks, relations, focus: gymOf(run).rules.scout },
        avoid: used,
      },
    );
    team.forEach((p) => used.add(p.family));
    return team;
  });
  rosterCache.set(key, rosters);
  if (rosterCache.size > ROSTER_CACHE_SIZE) {
    const oldest = rosterCache.keys().next().value;
    if (oldest !== undefined) rosterCache.delete(oldest);
  }
  return rosters;
}

export function opponentFor(
  run: GymRun,
  battle: number,
  pool: readonly BattlePokemon[],
  relations: TypeRelations,
) {
  const team = opponentRosters(run, pool, relations)[battle];
  if (!team) return [];
  return countersLead(run, battle) ? counterPick(team, playerTeam(run, pool)[0], relations) : team;
}

export function battleFor(
  run: GymRun,
  pool: readonly BattlePokemon[],
  relations: TypeRelations,
): BattleResult {
  const team = playerTeam(run, pool);
  const opponent = opponentFor(run, run.battle, pool, relations);
  return simulateBattle(
    team,
    opponent,
    relations,
    `${run.seed}|battle|${run.battle}|${run.order.join(",")}`,
    isGauntlet(run) ? { playerHp: teamHp(run, pool) } : {},
  );
}

/** Applies a finished battle: records it, then moves to the next battle, the badge, or the end. */
export function applyResult(
  run: GymRun,
  result: BattleResult,
  pool: readonly BattlePokemon[],
  relations: TypeRelations,
): GymRun {
  if (run.phase !== "ready") return run;
  const fainted = (side: "player" | "opponent") =>
    result.events.filter((e) => e.kind === "faint" && e.side === side).length;
  const team = playerTeam(run, pool);
  const opponent = opponentFor(run, run.battle, pool, relations);
  const playerStats = battleStats(result, "player");
  const opponentBest = mvpIndex(battleStats(result, "opponent"));
  const record: BattleRecord = {
    battle: run.battle,
    won: result.winner === "player",
    order: team.map((p) => p.name),
    opponent: opponent.map((p) => p.name),
    remaining: team.length - fainted("player"),
    opponentRemaining: opponent.length - fainted("opponent"),
    damage: Object.fromEntries(team.map((p, i) => [p.name, playerStats[i]?.damage ?? 0])),
    ...(opponentBest === undefined ? {} : { opponentMvp: opponent[opponentBest]?.name }),
  };
  const history = [...run.history, record];
  // Gauntlet: HP carries over; survivors recover a little, the fainted stay down.
  const heal = gymOf(run).rules.heal ?? 0;
  const hp = isGauntlet(run)
    ? Object.fromEntries(
        team.map((p, i) => {
          const max = result.maxHp.player[i] ?? 0;
          const left = result.finalHp.player[i] ?? 0;
          return [p.name, left > 0 ? Math.min(max, left + Math.floor(max * heal)) : 0];
        }),
      )
    : run.hp;
  if (!record.won) return { ...run, history, hp, phase: "lost" };
  const battle = run.battle + 1;
  return { ...run, history, hp, battle, phase: battle >= battleCount(run) ? "won" : "ready" };
}
