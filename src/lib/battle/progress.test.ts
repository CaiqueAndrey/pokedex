import { describe, expect, it } from "vitest";
import { snapshotPool } from "@/server/pokedex/battle-pool";
import type { BattleEvent, BattleResult, Side } from "@/types/battle";
import {
  EMPTY_STATS,
  achievementsFor,
  addDailyItem,
  addToHistory,
  cleanTrainerName,
  badgeCount,
  catchLegendary,
  dailyItem,
  dailyStreak,
  playsToStreakBonus,
  streakBonus,
  levelFor,
  nextStep,
  totalXp,
  xpForLevel,
  xpForRun,
  dailyKey,
  dailySeed,
  favoritePick,
  formatDailyDate,
  pastDays,
  recordDaily,
  recordRun,
  spendMasterBall,
  resultGrid,
  rewardFor,
  shareText,
} from "./progress";
import { startRun, type BattleRecord, type GymRun } from "./run";
import { battleStats, mvpIndex, topDamage } from "./stats";

const pool = snapshotPool();

const record = (battle: number, won: boolean): BattleRecord => ({
  battle,
  won,
  order: [],
  opponent: [],
  remaining: won ? 3 : 0,
  opponentRemaining: won ? 0 : 2,
  damage: {},
});

/** A finished run that won `won` battles (all of the mode's battles with `badge`). */
function finished(won: number, badge: boolean, overrides: Partial<GymRun> = {}): GymRun {
  const total = 5;
  return {
    ...startRun("p"),
    picks: ["pidgey", "rattata", "geodude", "squirtle", "pikachu", "oddish"],
    phase: badge ? "won" : "lost",
    battle: badge ? total : won,
    history: Array.from({ length: badge ? total : won + 1 }, (_, i) => record(i, i < won)),
    ...overrides,
  };
}

function attack(side: Side, attacker: number, defender: number, hpLeft: number): BattleEvent {
  return {
    kind: "attack",
    side,
    attacker,
    defender,
    type: "normal",
    damage: 999,
    effectiveness: 1,
    critical: false,
    struggle: false,
    hpLeft,
  };
}

describe("battle stats", () => {
  const result: BattleResult = {
    winner: "player",
    choicePoints: [],
    maxHp: { player: [100, 100], opponent: [50, 80] },
    startHp: { player: [100, 100], opponent: [50, 80] },
    finalHp: { player: [0, 100], opponent: [0, 0] },
    events: [
      { kind: "send", side: "player", index: 0 },
      { kind: "send", side: "opponent", index: 0 },
      attack("player", 0, 0, 30),
      attack("opponent", 0, 0, 60),
      attack("player", 0, 0, 0),
      { kind: "faint", side: "opponent", index: 0 },
      { kind: "send", side: "opponent", index: 1 },
      attack("opponent", 1, 0, 0),
      { kind: "faint", side: "player", index: 0 },
      { kind: "send", side: "player", index: 1 },
      attack("player", 1, 1, 0),
      { kind: "end", winner: "player" },
    ],
  };

  it("counts damage actually dealt (no overkill) and knockouts", () => {
    expect(battleStats(result, "player")).toEqual([
      { damage: 50, knockouts: 1 },
      { damage: 80, knockouts: 1 },
    ]);
    expect(battleStats(result, "opponent")).toEqual([
      { damage: 40, knockouts: 0 },
      { damage: 60, knockouts: 1 },
    ]);
  });

  it("picks the MVP by damage, then knockouts", () => {
    expect(mvpIndex(battleStats(result, "player"))).toBe(1);
    expect(mvpIndex([{ damage: 0, knockouts: 0 }])).toBeUndefined();
    expect(
      mvpIndex([
        { damage: 10, knockouts: 0 },
        { damage: 10, knockouts: 1 },
      ]),
    ).toBe(1);
    expect(topDamage([{ a: 10, b: 5 }, { b: 20 }])).toBe("b");
    expect(topDamage([])).toBeUndefined();
  });
});

describe("lifetime stats", () => {
  it("counts runs, badges, battles, best result and streaks", () => {
    let stats = recordRun(EMPTY_STATS, finished(5, true));
    stats = recordRun(stats, finished(5, true));
    expect(stats).toMatchObject({ runs: 2, battlesWon: 10, best: 5, streak: 2 });
    expect(badgeCount(stats)).toBe(2);
    stats = recordRun(stats, finished(4, false, { mode: "hard" }));
    expect(stats).toMatchObject({ runs: 3, battlesWon: 14, streak: 0, bestStreak: 2 });
    expect(stats.lastMode).toBe("hard");
    expect(stats.balls).toEqual({ poke: 0, great: 1, ultra: 2, master: 0 });
    // The daily challenge counts and gives a Master Ball, but doesn't change the preferred mode.
    stats = recordRun(stats, finished(5, true, { mode: "daily", daily: "2026-11-05" }));
    expect(stats.cleared).toEqual({ easy: 2, hard: 0, daily: 1 });
    // The daily's top ball is the Ultra Ball; its Master Ball comes from the streak.
    expect(stats.balls.ultra).toBe(3);
    expect(stats.balls.master).toBe(0);
    expect(stats.lastMode).toBe("hard");
    expect(badgeCount(stats)).toBe(2);
    expect(stats.used.pidgey).toBe(4);
    expect(favoritePick(stats)).toBe("pidgey");
    expect(favoritePick(EMPTY_STATS)).toBeUndefined();
  });
});

describe("achievements", () => {
  it("unlocks only what the run earned", () => {
    expect(achievementsFor(finished(0, false), pool, EMPTY_STATS)).toEqual([]);
    expect(achievementsFor(finished(2, false), pool, EMPTY_STATS)).toEqual(["first-win"]);
    // A weak team (well under 2.300) wins the badge in easy mode.
    const unlocked = achievementsFor(finished(5, true), pool, EMPTY_STATS);
    expect(unlocked).toEqual(expect.arrayContaining(["first-win", "badge", "budget-badge"]));
    expect(unlocked).not.toContain("hard-badge");
    expect(unlocked).not.toContain("daily-badge");
  });

  it("rewards Pokéballs by battles won and by mode", () => {
    expect(rewardFor(finished(2, false))).toBeUndefined();
    expect(rewardFor(finished(3, false))).toBe("poke");
    expect(rewardFor(finished(4, false, { mode: "hard" }))).toBe("great");
    expect(rewardFor(finished(5, true))).toBe("ultra");
    expect(rewardFor(finished(5, true, { mode: "hard" }))).toBe("master");
    // The gauntlet ladder: 3, 5, 7 and 10 trainers beaten.
    // The daily always pays something: 1, 3 and 5 trainers beaten.
    expect(rewardFor(finished(0, false, { mode: "daily" }))).toBeUndefined();
    expect(rewardFor(finished(1, false, { mode: "daily" }))).toBe("poke");
    expect(rewardFor(finished(3, false, { mode: "daily" }))).toBe("great");
    expect(rewardFor(finished(5, true, { mode: "daily" }))).toBe("ultra");
  });

  it("covers hard mode, babies, a flawless leader, variety, both badges and streaks", () => {
    const run = finished(5, true, {
      mode: "hard",
      picks: ["pichu", "dragonite", "tyranitar", "gyarados", "gengar", "scizor"],
    });
    run.history[4] = { ...record(4, true), remaining: 6 };
    const unlocked = achievementsFor(run, pool, {
      ...EMPTY_STATS,
      streak: 3,
      cleared: { easy: 1, hard: 1, daily: 0 },
    });
    expect(unlocked).toEqual(
      expect.arrayContaining([
        "hard-badge",
        "both-badges",
        "baby-champion",
        "flawless-leader",
        "variety-champion",
        "streak-3",
        "master-ball",
      ]),
    );
    expect(unlocked).not.toContain("budget-badge");
    expect(unlocked).not.toContain("badge");
    const daily = finished(5, true, { mode: "daily", daily: "2026-11-05" });
    expect(achievementsFor(daily, pool, EMPTY_STATS)).toContain("daily-badge");
  });
});

describe("daily challenge", () => {
  it("uses the local date as key and seed", () => {
    expect(dailyKey(new Date(2026, 10, 5, 23, 59))).toBe("2026-11-05");
    expect(dailySeed("2026-11-05")).toBe("dia-2026-11-05");
    expect(formatDailyDate("2026-11-05")).toBe("05/11");
  });

  it("only the first attempt of the day counts, and old days roll off", () => {
    const first = recordDaily([], finished(3, false, { daily: "2026-11-05" }));
    expect(first).toEqual([{ date: "2026-11-05", won: false, battlesWon: 3 }]);
    expect(recordDaily(first, finished(5, true, { daily: "2026-11-05" }))).toEqual(first);
    // A regular run never touches the daily results.
    expect(recordDaily(first, finished(5, true))).toEqual(first);

    let many = first;
    for (let day = 1; day <= 31; day++) {
      const daily = `2026-12-${String(day).padStart(2, "0")}`;
      many = recordDaily(many, finished(1, false, { daily }));
    }
    expect(many).toHaveLength(30);
    expect(many.at(-1)?.date).toBe("2026-12-31");
  });

  it("shares a spoiler-free grid", () => {
    expect(resultGrid(3, false)).toBe("🟩🟩🟩🟥⬛");
    expect(resultGrid(5, true)).toBe("🟩🟩🟩🟩🟩");
    expect(resultGrid(0, false)).toBe("🟥⬛⬛⬛⬛");
    expect(resultGrid(6, false, 10)).toBe("🟩🟩🟩🟩🟩🟩🟥⬛⬛⬛");
  });

  it("builds the share text for daily and seeded runs", () => {
    expect(
      shareText({ mode: "daily", battlesWon: 2, won: false, daily: "2026-11-05" }, "https://x.dev"),
    ).toBe("Emboscada da Equipe Rocket · Desafio do dia 05/11\n🟩🟩🟥⬛⬛ 2/5\nhttps://x.dev/gym");
    expect(
      shareText({ mode: "hard", battlesWon: 5, won: true, seed: "abc" }, "https://x.dev"),
    ).toBe(
      "Ginásio de Cerulean · Semente abc · Difícil\n🟩🟩🟩🟩🟩 5/5 🏅\nhttps://x.dev/gym?seed=abc",
    );
  });
});

describe("Master Ball, legendaries, bag and practice", () => {
  it("spends Master Balls and records catches once", () => {
    const stats = { ...EMPTY_STATS, balls: { ...EMPTY_STATS.balls, master: 1 } };
    const spent = spendMasterBall(stats);
    expect(spent.balls.master).toBe(0);
    expect(spendMasterBall(spent)).toBe(spent);
    const caught = catchLegendary(catchLegendary(spent, "lugia"), "lugia");
    expect(caught.caught).toEqual(["lugia"]);
  });

  it("draws the same item for everyone on a day, and adds it for a cleared daily", () => {
    expect(dailyItem("2026-11-05")).toBe(dailyItem("2026-11-05"));
    const days = pastDays("2026-11-05", 30).map(dailyItem);
    expect(new Set(days).size).toBeGreaterThan(5);
    // Beating 3 trainers is enough for the day's item.
    const run = finished(3, false, { mode: "daily", daily: "2026-11-05" });
    const item = dailyItem("2026-11-05");
    expect(addDailyItem({}, run)).toEqual({ [item]: 1 });
    expect(addDailyItem({ [item]: 1 }, run)).toEqual({ [item]: 2 });
    expect(addDailyItem({}, finished(2, false, { mode: "daily", daily: "2026-11-05" }))).toEqual(
      {},
    );
    expect(addDailyItem({}, { ...run, practice: true })).toEqual({});
  });

  it("practice runs change nothing", () => {
    const practice = finished(5, true, { mode: "daily", daily: "2026-11-05", practice: true });
    expect(recordRun(EMPTY_STATS, practice)).toBe(EMPTY_STATS);
    expect(recordDaily([], practice)).toEqual([]);
    expect(achievementsFor(practice, pool, EMPTY_STATS)).toEqual([]);
  });

  it("lists the archive days before today, most recent first", () => {
    expect(pastDays("2026-03-02", 3)).toEqual(["2026-03-01", "2026-02-28", "2026-02-27"]);
  });

  it("a cleared run with a legendary unlocks 'Lenda viva'", () => {
    const legendaryPool = [
      ...pool,
      { ...pool[0]!, name: "lugia", family: -1, legendary: true as const },
    ];
    const run = finished(5, true, {
      picks: ["lugia", "rattata", "geodude", "squirtle", "pikachu", "oddish"],
    });
    expect(achievementsFor(run, legendaryPool, EMPTY_STATS)).toContain("legend-champion");
  });
});

describe("trainer: level, XP and history", () => {
  it("levels up on a growing curve, with ranks", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(300);
    expect(levelFor(0)).toMatchObject({ level: 1, rank: "rookie", into: 0, needed: 100 });
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100)).toMatchObject({ level: 2, into: 0, needed: 200 });
    expect(levelFor(xpForLevel(5)).rank).toBe("ace");
    expect(levelFor(xpForLevel(12)).rank).toBe("master");
  });

  it("gives XP for battles won and cleared runs; practice gives none", () => {
    expect(xpForRun(finished(2, false))).toBe(20);
    expect(xpForRun(finished(5, true))).toBe(50 + 50);
    expect(xpForRun(finished(5, true, { mode: "hard" }))).toBe(50 + 100);
    expect(xpForRun(finished(5, true, { practice: true }))).toBe(0);
    const stats = recordRun(recordRun(EMPTY_STATS, finished(5, true)), finished(2, false));
    expect(totalXp(stats)).toBe(70 + 50);
    expect(totalXp({ ...stats, caught: ["lugia"] })).toBe(150);
  });

  it("keeps the last 10 runs, newest first", () => {
    let history = addToHistory([], finished(1, false), "2026-11-05T10:00:00.000Z");
    for (let i = 0; i < 12; i++) history = addToHistory(history, finished(2, false), `t${i}`);
    expect(history).toHaveLength(10);
    expect(history[0]?.finishedAt).toBe("t11");
  });

  it("cleans trainer names", () => {
    expect(cleanTrainerName("  Ash   Ketchum  ")).toBe("Ash Ketchum");
    expect(cleanTrainerName("a".repeat(40))).toHaveLength(16);
    expect(cleanTrainerName("   ")).toBe("");
  });
});

describe("daily streak", () => {
  const played = (...dates: string[]) => dates.map((date) => ({ date, won: false, battlesWon: 1 }));

  it("counts consecutive days ending today, or yesterday while today is still open", () => {
    expect(dailyStreak([], "2026-11-05")).toBe(0);
    expect(dailyStreak(played("2026-11-05"), "2026-11-05")).toBe(1);
    expect(dailyStreak(played("2026-11-03", "2026-11-04"), "2026-11-05")).toBe(2);
    expect(dailyStreak(played("2026-11-02", "2026-11-04"), "2026-11-05")).toBe(1);
    expect(dailyStreak(played("2026-11-02", "2026-11-03"), "2026-11-05")).toBe(0);
    // Across a month boundary.
    expect(dailyStreak(played("2026-10-31", "2026-11-01"), "2026-11-01")).toBe(2);
  });

  it("tells how many plays the next Master Ball needs", () => {
    expect(playsToStreakBonus([], "2026-11-05")).toBe(3);
    expect(playsToStreakBonus(played("2026-11-03", "2026-11-04"), "2026-11-05")).toBe(1);
    expect(playsToStreakBonus(played("2026-11-03", "2026-11-04", "2026-11-05"), "2026-11-05")).toBe(
      3,
    );
  });

  it("pays a Master Ball on every third day in a row, once", () => {
    const before = played("2026-11-03", "2026-11-04");
    const after = recordDaily(before, finished(0, false, { mode: "daily", daily: "2026-11-05" }));
    expect(streakBonus(before, after, "2026-11-05")).toBe(3);
    // The same day again (not recorded twice) or a non-multiple streak: nothing.
    expect(streakBonus(after, after, "2026-11-05")).toBeUndefined();
    const two = recordDaily(
      played("2026-11-04"),
      finished(0, false, { mode: "daily", daily: "2026-11-05" }),
    );
    expect(streakBonus(played("2026-11-04"), two, "2026-11-05")).toBeUndefined();
  });
});

describe("next step on the hub", () => {
  const played = { ...EMPTY_STATS, runs: 3 };
  it("starts a first visit in the easy gym, then asks for the daily challenge", () => {
    expect(nextStep({ stats: EMPTY_STATS, badges: [], playedToday: false })).toEqual({
      kind: "gym",
      mode: "easy",
      reason: "first",
    });
    expect(nextStep({ stats: played, badges: [], playedToday: false })).toEqual({
      kind: "daily",
    });
  });

  it("spends a Master Ball, then chases the missing badge, then replays", () => {
    const master = { ...played, balls: { ...played.balls, master: 1 } };
    expect(nextStep({ stats: master, badges: [], playedToday: true }).kind).toBe("legendary");
    expect(nextStep({ stats: played, badges: [], playedToday: true })).toMatchObject({
      mode: "easy",
      reason: "badge",
    });
    expect(nextStep({ stats: played, badges: ["boulder"], playedToday: true })).toMatchObject({
      mode: "hard",
      reason: "badge",
    });
    expect(
      nextStep({
        stats: { ...played, lastMode: "hard" },
        badges: ["boulder", "cascade"],
        playedToday: true,
      }),
    ).toEqual({ kind: "gym", mode: "hard", reason: "again" });
  });
});
