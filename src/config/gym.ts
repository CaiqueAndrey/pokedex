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
}

export interface Gym {
  /** Badge id in storage; null for a challenge without a badge (Team Rocket). */
  badgeId: string | null;
  name: string;
  leader: string;
  leaderImage: string;
  badge: string | null;
  badgeImage: string | null;
  rules: ModeRules;
  battles: readonly GymBattle[];
}

export const BATTLES_PER_RUN = 5;

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
    badgeId: "boulder",
    name: "Ginásio de Pewter",
    leader: "Brock",
    leaderImage: "/img/Brock.png",
    badge: "Insígnia da Rocha",
    badgeImage: "/img/insignia_rock.webp",
    rules: {
      player: 2800,
      opponents: 2450,
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
    badgeId: "cascade",
    name: "Ginásio de Cerulean",
    leader: "Misty",
    leaderImage: "/img/misty.png",
    badge: "Insígnia da Cascata",
    badgeImage: "/img/insignia_water.png",
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
    badgeId: null,
    name: "Equipe Rocket",
    leader: "Jessie",
    leaderImage: "/img/jessie.png",
    badge: null,
    badgeImage: null,
    rules: {
      player: 2650,
      opponents: 2400,
      follow: 0,
      scout: 0.15,
      counterPick: true,
      reveal: true,
    },
    battles: [
      { classes: ["Recruta Rocket"], budgetFactor: 0.9 },
      { classes: ["Recruta Rocket", "Cientista Rocket"], budgetFactor: 0.95 },
      { classes: ["Cientista Rocket", "Executivo Rocket"], budgetFactor: 1.0 },
      { trainer: "James", budgetFactor: 1.05, signature: "weezing", image: "/img/james.png" },
      {
        trainer: "Jessie",
        budgetFactor: 1.1,
        leader: true,
        signature: "arbok",
        image: "/img/jessie.png",
      },
    ],
  },
};

/** Pokéballs won at the end of a run, from the worst to the best. */
export const BALLS = ["poke", "great", "ultra", "master"] as const;
export type Ball = (typeof BALLS)[number];
export const BALL_IMAGES: Record<Ball, string> = {
  poke: "/img/pokeball.png",
  great: "/img/greatball.png",
  ultra: "/img/ultraball.png",
  master: "/img/masterball.png",
};
/** Battles won → ball. Clearing a run gives the mode's top ball (the hard ones: a Master Ball). */
export const BALL_FOR_WINS: Record<number, Ball> = { 3: "poke", 4: "great" };
export const BALL_FOR_CLEAR: Record<GymMode, Ball> = {
  easy: "ultra",
  hard: "master",
  daily: "master",
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
export const RULES_VERSION = 2;

/** Default player cap when one applies (hard mode). */
export const TEAM_BUDGET = 2500;

export const BATTLE_LEVEL = 50;
export const MOVE_POWER = 60;
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
  "legend-champion",
] as const;
export type AchievementId = (typeof ACHIEVEMENTS)[number];

/** "Budget champion": win the badge with a team at or under this strength. */
export const BUDGET_CHAMPION_BST = 2300;
/** "Variety champion": win the badge with a team covering at least this many types. */
export const VARIETY_CHAMPION_TYPES = 9;
/** How many past daily results are kept. */
export const DAILY_HISTORY = 30;
