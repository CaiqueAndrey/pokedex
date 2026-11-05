import { z } from "zod";
import {
  BATTLE_REWARDS,
  GYMS,
  HAND_SIZE,
  MAX_BATTLES,
  MAX_BONUS_REROLLS,
  REROLLS_PER_RUN,
  REWARD_ITEM_NAMES,
  type BattleReward,
  type RewardItemName,
  RULES_VERSION,
  TEAM_SIZE,
  TRAINER_NAMES,
  type GymMode,
} from "@/config/gym";
import type { BattlePokemon, BattleResult } from "@/types/battle";
import type { TypeRelations } from "@/types/pokemon";
import { drawHand, draftRound, legendaryRound, type DraftRound } from "./draft";
import { evolutionOf, trained } from "./items";
import { levelStats } from "./damage";
import { counterPick, generateOpponent } from "./opponents";
import { hashString, pick, rngFrom, shuffle } from "./rng";
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
  rerollsUsed: z
    .number()
    .int()
    .min(0)
    .max(REROLLS_PER_RUN + MAX_BONUS_REROLLS),
  /** Rerolls bought with valuables (Pepita, Pedaço de Estrela). */
  bonusRerolls: z.number().int().min(0).max(MAX_BONUS_REROLLS).default(0),
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
  /** Trained Pokémon (names): attacks and speed up for the rest of the run. */
  boosts: z.array(z.string()).max(TEAM_SIZE).default([]),
  /** Evolutions during the run (items or the Rare Candy reward), in order. */
  evolved: z
    .array(z.object({ from: z.string(), to: z.string() }))
    .max(12)
    .default([]),
  /** A won battle's reward, still to choose before the next battle. */
  reward: z
    .object({ battle: z.number().int().min(0), options: z.array(z.enum(BATTLE_REWARDS)) })
    .optional(),
  /** Battles whose hidden opponent was revealed by a "scout" reward. */
  scouted: z.array(z.number().int().min(0)).default([]),
  /**
   * A battle in progress and your replacement picks so far. Saved so a reload resumes the same
   * battle instead of letting you reorder after seeing it.
   */
  battling: z.object({ choices: z.array(z.number().int().min(0)).max(TEAM_SIZE) }).optional(),
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
    bonusRerolls: 0,
    boosts: [],
    evolved: [],
    scouted: [],
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

/** Your team in battle order, with training applied. */
export function playerTeam(run: GymRun, pool: readonly BattlePokemon[]): BattlePokemon[] {
  const team = resolve(run.order.length === run.picks.length ? run.order : run.picks, pool);
  return run.boosts.length === 0
    ? team
    : team.map((p) => (run.boosts.includes(p.name) ? trained(p) : p));
}

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

/** Rerolls left in the draft (the free one plus any bought). */
export const rerollsLeft = (run: GymRun) => REROLLS_PER_RUN + run.bonusRerolls - run.rerollsUsed;

export function reroll(run: GymRun): GymRun {
  if (run.phase !== "draft" || rerollsLeft(run) <= 0) return run;
  return { ...run, rerollsUsed: run.rerollsUsed + 1 };
}

/** One more reroll, bought with a valuable from the bag (the caller spends the item). */
export function addBonusReroll(run: GymRun): GymRun {
  if (run.phase !== "draft" || run.bonusRerolls >= MAX_BONUS_REROLLS) return run;
  return { ...run, bonusRerolls: run.bonusRerolls + 1 };
}

/**
 * Evolves a team member with `item` (between battles): same slot, same order, training kept. A
 * no-op when it can't evolve with that item.
 */
export function evolveMember(
  run: GymRun,
  name: string,
  item: RewardItemName,
  pool: readonly BattlePokemon[],
): GymRun {
  const member = resolve([name], pool)[0];
  if (run.phase !== "ready" || run.battling || !member || !run.picks.includes(name)) return run;
  const next = evolutionOf(member, pool, item);
  if (!next) return run;
  const swap = (names: readonly string[]) => names.map((n) => (n === name ? next.name : n));
  return {
    ...run,
    picks: swap(run.picks),
    order: swap(run.order),
    boosts: swap(run.boosts),
    evolved: [...run.evolved, { from: name, to: next.name }],
  };
}

/** The three rewards after a win: training, an item, and an evolution (or scouting when hidden). */
export function rewardOptions(run: Pick<GymRun, "mode">): BattleReward[] {
  return ["train", "item", gymOf(run).rules.reveal ? "evolve" : "scout"];
}

/** The item a reward gives (the same for a seed and battle). */
export const rewardItem = (run: Pick<GymRun, "seed">, battle: number): RewardItemName =>
  REWARD_ITEM_NAMES[hashString(`${run.seed}|reward|${battle}`) % REWARD_ITEM_NAMES.length] ??
  "rare-candy";

/**
 * Takes (or skips, with `kind` undefined) the pending reward. Training and the Rare Candy need a
 * `target` from the team; "item" changes nothing here (the bag lives outside the run).
 */
export function chooseReward(
  run: GymRun,
  kind: BattleReward | undefined,
  pool: readonly BattlePokemon[],
  target?: string,
): GymRun {
  if (!run.reward) return run;
  const done = { ...run, reward: undefined };
  if (kind === "train" && target && run.picks.includes(target) && !run.boosts.includes(target))
    return { ...done, boosts: [...run.boosts, target] };
  if (kind === "evolve" && target) {
    const evolved = evolveMember(done, target, "rare-candy", pool);
    return evolved === done ? run : evolved;
  }
  if (kind === "scout") return { ...done, scouted: [...run.scouted, run.battle] };
  if (kind === "train" || kind === "evolve") return run;
  return done;
}

/** Whether the opponent of the current battle shows (easy mode, or scouted in hard). */
export const opponentRevealed = (run: GymRun) =>
  gymOf(run).rules.reveal || run.scouted.includes(run.battle);

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
  const field = gymOf(run).field;
  return simulateBattle(
    team,
    opponent,
    relations,
    `${run.seed}|battle|${run.battle}|${run.order.join(",")}`,
    {
      ...(isGauntlet(run) ? { playerHp: teamHp(run, pool) } : {}),
      ...(field ? { field } : {}),
      choices: run.battling?.choices ?? [],
    },
  );
}

/** Starts the battle (saved), or records your next replacement pick in it. */
export const startBattle = (run: GymRun): GymRun =>
  run.phase === "ready" && !run.reward
    ? { ...run, battling: run.battling ?? { choices: [] } }
    : run;

export function chooseReplacementPick(run: GymRun, index: number): GymRun {
  if (!run.battling) return run;
  return { ...run, battling: { choices: [...run.battling.choices, index] } };
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
  const after = { ...run, history, hp, battling: undefined };
  if (!record.won) return { ...after, phase: "lost" };
  const battle = run.battle + 1;
  if (battle >= battleCount(run)) return { ...after, battle, phase: "won" };
  // Between gym battles, a reward to choose (the gauntlet has none).
  const reward = isGauntlet(run) ? undefined : { battle, options: rewardOptions(run) };
  return { ...after, battle, phase: "ready", ...(reward ? { reward } : {}) };
}
