import type { PokemonTypeName } from "@/types/pokemon";

/** Gym content and game rules (project-goal.md §8.8–8.9). Tune balance here, not in the engine. */

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

export type GymMode = "easy" | "hard" | "daily";
/** Modes the player picks on the start screen; the daily challenge has its own button. */
export const SELECTABLE_MODES = ["easy", "hard"] as const satisfies readonly GymMode[];

/**
 * Per-mode rules (base stat totals).
 *
 * - `player`: team cap, so every strong pick early costs a weaker one later.
 * - `opponents` + `follow`: opponent budget = `opponents + follow × (team − opponents)`. 0 ignores
 *   the player's strength (the cap already weighs it), 1 would cancel the draft out.
 * - `scout`: how often a trainer, building its team, takes the candidate with the best type matchup
 *   against *your* team instead of a random one (0 = random teams, 1 = always the counter).
 * - `counterPick`: every trainer picks its lead after seeing yours (leaders and bosses always do).
 * - `reveal`: show the opponent's team, your stats and matchup hints.
 *
 * Tuning (simulated runs with four strategies) is in docs/phases/09-gym-mode-2.md.
 */
export interface ModeRules {
  player: number | null;
  opponents: number;
  follow: number;
  scout: number;
  counterPick: boolean;
  reveal: boolean;
  /** Gauntlet only: share of max HP survivors recover between battles. */
  heal?: number;
}

export interface GymBattle {
  /** Fixed name (leaders, bosses); otherwise one of `classes` plus a name drawn from the seed. */
  trainer?: string;
  classes?: readonly string[];
  /** Opponent budget as a fraction of the mode's opponent budget (the curve up to the leader). */
  budgetFactor: number;
  /** The last battle: wins the run. */
  leader?: boolean;
  /** Pokémon this trainer always brings (by name), e.g. Misty's Starmie. */
  signature?: string;
  /** Artwork shown before the battle (in `public/`). */
  image?: string;
  /** Pokémon this trainer brings (default 6). Team Rocket grunts carry two or three. */
  teamSize?: number;
}

/** A reward threshold: winning at least `wins` battles in a run earns `ball`. */
export interface BallReward {
  wins: number;
  ball: Ball;
}

/** A gym's field: damage multipliers by attack type, for both sides (labels in messages). */
export type Field = Partial<Record<PokemonTypeName, number>>;

export interface Gym {
  /** The field every battle here is fought on (Pewter's rocky ground, Cerulean's rain). */
  field?: Field;
  /**
   * `gym`: a six-round die draft, then the battles, fully healed between them. `gauntlet` (the daily
   * Team Rocket hideout): pick 6 from the same hand of 12 for everyone, then as many battles as you
   * last, with HP carried over (survivors recover `healBetween` of their max HP).
   */
  format: "gym" | "gauntlet";
  /** Badge id in storage; null for a challenge without a badge (Team Rocket). */
  badgeId: string | null;
  name: string;
  leader: string;
  leaderImage: string;
  badge: string | null;
  badgeImage: string | null;
  /** Victory art for clearing the run (black background, shown in a rounded square). */
  trophyImage: string;
  rules: ModeRules;
  battles: readonly GymBattle[];
  /** Pokéballs by battles won, ascending: a run earns the best threshold it reached. */
  rewards: readonly BallReward[];
}

/** Battles in a gym run; the gauntlet has its own length (`GYMS.daily.battles`). */
export const BATTLES_PER_RUN = 5;
/** The most battles any mode has (schema limit, with room to grow). */
export const MAX_BATTLES = 10;
/** Gauntlet: the hand everyone drafts from, and what survivors recover between battles. */
export const HAND_SIZE = 12;
/** Gauntlet: beating this many trainers also wins the day's item. */
export const DAILY_ITEM_WINS = 3;
/** Playing the daily challenge this many days in a row (any result) earns a Master Ball. */
export const DAILY_STREAK_BONUS = 3;

/** First names for gym trainers, drawn per run from the seed. */
export const TRAINER_NAMES = [
  "Liam",
  "Rui",
  "Lia",
  "Davi",
  "Ana",
  "Bruno",
  "Caio",
  "Duda",
  "Enzo",
  "Fê",
  "Gabi",
  "Hugo",
  "Iara",
  "Juca",
  "Kiko",
  "Lara",
  "Malu",
  "Nina",
  "Otto",
  "Pietra",
  "Raul",
  "Sofia",
  "Téo",
  "Vivi",
  "Yuri",
  "Zeca",
  "Bia",
  "Léo",
  "Mel",
  "Tito",
] as const;

export const GYMS: Record<GymMode, Gym> = {
  easy: {
    format: "gym",
    badgeId: "boulder",
    name: "Ginásio de Pewter",
    leader: "Brock",
    leaderImage: "/img/Brock.png",
    badge: "Insígnia da Rocha",
    badgeImage: "/img/insignia_rock.webp",
    trophyImage: "/img/championKanto.png",
    field: { rock: 1.2, ground: 1.2 },
    rewards: [
      { wins: 3, ball: "poke" },
      { wins: 4, ball: "great" },
      { wins: 5, ball: "ultra" },
    ],
    rules: {
      player: 2800,
      opponents: 2500,
      follow: 0,
      scout: 0.25,
      counterPick: false,
      reveal: true,
    },
    battles: [
      { classes: ["Campista", "Escoteira", "Garota do Piquenique"], budgetFactor: 0.9 },
      { classes: ["Montanhista", "Mochileiro", "Alpinista"], budgetFactor: 0.95 },
      { classes: ["Campista", "Montanhista", "Alpinista"], budgetFactor: 1.0 },
      { classes: ["Treinador", "Treinadora", "Mochileiro"], budgetFactor: 1.05 },
      {
        trainer: "Brock",
        budgetFactor: 1.1,
        leader: true,
        signature: "onix",
        image: "/img/Brock.png",
      },
    ],
  },
  hard: {
    format: "gym",
    badgeId: "cascade",
    name: "Ginásio de Cerulean",
    leader: "Misty",
    leaderImage: "/img/misty.png",
    badge: "Insígnia da Cascata",
    badgeImage: "/img/insignia_water.png",
    trophyImage: "/img/championCerulean.png",
    field: { water: 1.2, fire: 0.8 },
    rewards: [
      { wins: 3, ball: "poke" },
      { wins: 4, ball: "great" },
      { wins: 5, ball: "master" },
    ],
    rules: {
      player: 2500,
      opponents: 2400,
      follow: 0,
      scout: 0.15,
      counterPick: true,
      reveal: false,
    },
    battles: [
      { classes: ["Nadadora", "Nadador", "Banhista"], budgetFactor: 0.9 },
      { classes: ["Pescador", "Marinheiro", "Banhista"], budgetFactor: 0.95 },
      { classes: ["Surfista", "Nadadora", "Pescador"], budgetFactor: 1.0 },
      { classes: ["Treinadora", "Marinheiro", "Surfista"], budgetFactor: 1.05 },
      {
        trainer: "Misty",
        budgetFactor: 1.1,
        leader: true,
        signature: "starmie",
        image: "/img/misty.png",
      },
    ],
  },
  daily: {
    format: "gauntlet",
    badgeId: null,
    name: "Emboscada da Equipe Rocket",
    leader: "Jessie",
    leaderImage: "/img/jessie.png",
    badge: null,
    badgeImage: null,
    trophyImage: "/img/teamrocketdefeated.png",
    // Short and always rewarding: one win already pays. The Master Ball comes from the streak.
    rewards: [
      { wins: 1, ball: "poke" },
      { wins: 3, ball: "great" },
      { wins: 5, ball: "ultra" },
    ],
    rules: {
      player: 2700,
      opponents: 2500,
      heal: 0.5,
      follow: 0,
      scout: 0.15,
      counterPick: false,
      reveal: true,
    },
    battles: [
      { classes: ["Recruta Rocket"], budgetFactor: 0.8, teamSize: 2 },
      { classes: ["Recruta Rocket", "Cientista Rocket"], budgetFactor: 0.85, teamSize: 2 },
      { classes: ["Cientista Rocket", "Executivo Rocket"], budgetFactor: 0.85, teamSize: 3 },
      {
        trainer: "James",
        budgetFactor: 0.9,
        signature: "weezing",
        image: "/img/james.png",
        teamSize: 3,
      },
      {
        trainer: "Jessie",
        budgetFactor: 0.95,
        leader: true,
        signature: "arbok",
        image: "/img/jessie.png",
        teamSize: 4,
      },
    ],
  },
};

/**
 * The daily Team Rocket ambush (project-goal.md §8.10, Phase 14): a puzzle with open information.
 *
 * - `hand`, `pick`, `cap`: the day's hand, how many you take (in order) and their strength cap.
 * - `opponents`, `opponentBudget`, `signatures`: Jessie and James's revealed team.
 * - `attempts`: tries per day; `rewards[n]` is the ball for winning on attempt n + 1.
 * - `winRange`: the share of legal ordered teams that must win for a seed to be the day's puzzle;
 *   `maxSeeds` seeds are tried (then the closest one wins). Tuning in docs/phases/14-rocket-ambush.md.
 */
export const ROCKET_PUZZLE = {
  hand: 8,
  pick: 3,
  cap: 1250,
  opponents: 4,
  opponentBudget: 1800,
  signatures: ["arbok", "weezing"],
  attempts: 3,
  rewards: ["ultra", "great", "poke"],
  winRange: [0.1, 0.25],
  maxSeeds: 30,
} as const satisfies {
  hand: number;
  pick: number;
  cap: number;
  opponents: number;
  opponentBudget: number;
  signatures: readonly string[];
  attempts: number;
  rewards: readonly Ball[];
  winRange: readonly [number, number];
  maxSeeds: number;
};

/** "Treino" (a reward between battles): this share is added to one Pokémon's attacks and speed. */
export const TRAIN_BOOST = 0.1;
/** Stats a training raises. */
export const TRAINED_STATS = ["attack", "special-attack", "speed"] as const;
/** Extra rerolls a run can buy with valuables (Pepita, Pedaço de Estrela). */
export const MAX_BONUS_REROLLS = 3;

/**
 * What each bag item does in a run (simplified, see docs/phases/15-game-depth.md):
 * stones evolve a Pokémon whose evolution has one of the stone's types; the Rare Candy evolves any;
 * valuables buy one more reroll during the draft.
 */
export const ITEM_EFFECTS: Record<
  RewardItemName,
  { kind: "evolve"; types?: readonly PokemonTypeName[] } | { kind: "reroll" }
> = {
  "fire-stone": { kind: "evolve", types: ["fire"] },
  "water-stone": { kind: "evolve", types: ["water"] },
  "thunder-stone": { kind: "evolve", types: ["electric"] },
  "leaf-stone": { kind: "evolve", types: ["grass"] },
  "ice-stone": { kind: "evolve", types: ["ice"] },
  "moon-stone": { kind: "evolve", types: ["fairy", "normal", "poison"] },
  "sun-stone": { kind: "evolve", types: ["grass", "fire"] },
  "shiny-stone": { kind: "evolve", types: ["fairy", "normal"] },
  "dusk-stone": { kind: "evolve", types: ["dark", "ghost"] },
  "dawn-stone": { kind: "evolve", types: ["psychic", "fighting", "ice"] },
  "rare-candy": { kind: "evolve" },
  nugget: { kind: "reroll" },
  "star-piece": { kind: "reroll" },
};

/** Rewards offered after a won battle (one of three; "scout" only where the team is hidden). */
export const BATTLE_REWARDS = ["train", "item", "evolve", "scout"] as const;
export type BattleReward = (typeof BATTLE_REWARDS)[number];

/** Pokéballs won at the end of a run, from the worst to the best. */
export const BALLS = ["poke", "great", "ultra", "master"] as const;
export type Ball = (typeof BALLS)[number];
export const BALL_IMAGES: Record<Ball, string> = {
  poke: "/img/pokeball.png",
  great: "/img/greatball.png",
  ultra: "/img/ultraball.png",
  master: "/img/masterball.png",
};

/**
 * Items the daily challenge can award, one per day (drawn from the date). Data (sprite, price)
 * comes from the PokeAPI `/item/{name}`; the API has no pt-BR names, so they are curated here.
 */
export const REWARD_ITEMS = {
  "fire-stone": "Pedra do Fogo",
  "water-stone": "Pedra da Água",
  "thunder-stone": "Pedra do Trovão",
  "leaf-stone": "Pedra da Folha",
  "moon-stone": "Pedra da Lua",
  "sun-stone": "Pedra do Sol",
  "ice-stone": "Pedra do Gelo",
  "shiny-stone": "Pedra Brilhante",
  "dusk-stone": "Pedra do Anoitecer",
  "dawn-stone": "Pedra da Alvorada",
  "rare-candy": "Doce Raro",
  nugget: "Pepita",
  "star-piece": "Pedaço de Estrela",
} as const;
export type RewardItemName = keyof typeof REWARD_ITEMS;
export const REWARD_ITEM_NAMES = Object.keys(REWARD_ITEMS) as RewardItemName[];
/** Past daily challenges that can be replayed as practice. */
export const DAILY_ARCHIVE_DAYS = 7;

/**
 * Bumped whenever a rule change would alter the opponents or battles derived from a saved seed:
 * runs saved under other rules are discarded instead of changing mid-run.
 */
export const RULES_VERSION = 3;

/** Default player cap when one applies (hard mode). */
export const TEAM_BUDGET = 2500;

export const BATTLE_LEVEL = 50;
export const MOVE_POWER = 60;
/** Struggle (when no own type can hurt the defender): typeless, like the games since Gen 4. */
export const STRUGGLE_POWER = 50;
/** Struggle recoil, as a fraction of the attacker's max HP. */
export const STRUGGLE_RECOIL = 1 / 4;
export const STAB = 1.5;
export const CRITICAL_CHANCE = 1 / 24;
export const CRITICAL_MULTIPLIER = 1.5;
/** Safety net: a battle never runs longer than this many attacks. */
export const MAX_ATTACKS = 500;

/** Milliseconds per battle event for each speed setting. */
export const BATTLE_SPEEDS = { slow: 1500, medium: 850, fast: 300 } as const;
export type BattleSpeed = keyof typeof BATTLE_SPEEDS;

/** Achievements, in display order (labels in messages.gym.achievements). */
export const ACHIEVEMENTS = [
  "first-win",
  "badge",
  "hard-badge",
  "daily-badge",
  "both-badges",
  "budget-badge",
  "flawless-leader",
  "baby-champion",
  "variety-champion",
  "streak-3",
  "master-ball",
  "sharp-eye",
  "legend-champion",
] as const;
export type AchievementId = (typeof ACHIEVEMENTS)[number];

/** Achievements whose description stays a surprise until unlocked. */
export const SECRET_ACHIEVEMENTS: readonly AchievementId[] = [
  "sharp-eye",
  "flawless-leader",
  "baby-champion",
];

/** "Budget champion": win the badge with a team at or under this strength. */
export const BUDGET_CHAMPION_BST = 2300;
/** "Variety champion": win the badge with a team covering at least this many types. */
export const VARIETY_CHAMPION_TYPES = 9;
/** How many past daily results are kept. */
export const DAILY_HISTORY = 30;

/** XP per battle won and per cleared run (by mode), and per legendary caught. */
export const XP = {
  battle: 10,
  clear: { easy: 50, hard: 100, daily: 100 },
  legendary: 30,
  mission: 30,
} as const;
/** Trainer ranks by level (labels in messages.gym.trainer.ranks). */
export const RANKS = [
  { level: 1, id: "rookie" },
  { level: 3, id: "trainer" },
  { level: 5, id: "ace" },
  { level: 8, id: "veteran" },
  { level: 12, id: "master" },
] as const;
export type RankId = (typeof RANKS)[number]["id"];
/** Finished runs kept in the history. */
export const HISTORY_SIZE = 10;
export const TRAINER_NAME_MAX = 16;
