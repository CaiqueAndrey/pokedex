import { beforeAll, describe, expect, it } from "vitest";
import { GYMS, TEAM_SIZE } from "@/config/gym";
import { createFixtureClient } from "@/server/pokeapi/fixtures";
import { snapshotPool } from "@/server/pokedex/battle-pool";
import { createPokedexService } from "@/server/pokedex/service";
import type { TypeRelations } from "@/types/pokemon";
import { friendlyOpponent } from "./battle/friendly";
import { EMPTY_STATS, achievementProgress } from "./battle/progress";
import { EMPTY_DEX, generationOf, markSpecies, progressByGeneration } from "./dex-progress";
import {
  MISSIONS,
  WEEKLY_MISSIONS,
  addProgress,
  claimMission,
  forWeek,
  missionDone,
  weekKey,
  weeklyMissions,
} from "./missions";

let relations: TypeRelations;
beforeAll(async () => {
  relations = await createPokedexService(createFixtureClient()).getTypeRelations();
});

describe("weekly missions", () => {
  it("uses ISO weeks (Monday to Sunday)", () => {
    expect(weekKey(new Date(2026, 10, 5))).toBe("2026-W45");
    expect(weekKey(new Date(2026, 10, 2))).toBe("2026-W45");
    expect(weekKey(new Date(2026, 10, 1))).toBe("2026-W44");
    expect(weekKey(new Date(2021, 0, 1))).toBe("2020-W53");
  });

  it("draws the same three missions for everyone in a week", () => {
    const week = weeklyMissions("2026-W45");
    expect(week).toHaveLength(WEEKLY_MISSIONS);
    expect(new Set(week).size).toBe(WEEKLY_MISSIONS);
    expect(weeklyMissions("2026-W45")).toEqual(week);
    const weeks = Array.from({ length: 10 }, (_, i) => weeklyMissions(`2026-W${10 + i}`).join());
    expect(new Set(weeks).size).toBeGreaterThan(1);
  });

  it("sums or keeps the best, caps at the target, and claims once", () => {
    const week = "2026-W45";
    const [first, second] = weeklyMissions(week) as [keyof typeof MISSIONS, keyof typeof MISSIONS];
    let state = addProgress(null, week, first, 1);
    state = addProgress(state, week, first, 100);
    expect(state.progress[first]).toBe(MISSIONS[first].target);
    expect(missionDone(state, first)).toBe(true);
    state = addProgress(state, week, second, 2, "max");
    state = addProgress(state, week, second, 1, "max");
    expect(state.progress[second]).toBe(Math.min(2, MISSIONS[second].target));
    const claimed = claimMission(state, first);
    expect(claimed.claimed).toEqual([first]);
    expect(claimMission(claimed, first)).toBe(claimed);
    // Missions not drawn this week ignore events; a new week starts empty.
    const other = (Object.keys(MISSIONS) as (keyof typeof MISSIONS)[]).find(
      (id) => !weeklyMissions(week).includes(id),
    );
    if (other) expect(addProgress(state, week, other, 5).progress[other]).toBeUndefined();
    expect(forWeek(state, "2026-W46")).toEqual({ week: "2026-W46", progress: {}, claimed: [] });
  });
});

describe("your Pokédex: seen and used", () => {
  it("counts used as seen, once each, by generation", () => {
    let dex = markSpecies(EMPTY_DEX, { seen: [25, 25, 152] });
    dex = markSpecies(dex, { used: [1, 25], seen: [9999] });
    expect(dex.seen).toEqual([1, 25, 152]);
    expect(dex.used).toEqual([1, 25]);
    expect(generationOf(151)).toBe(1);
    expect(generationOf(152)).toBe(2);
    expect(generationOf(1025)).toBe(9);
    const rows = progressByGeneration(dex);
    expect(rows[0]).toEqual({ generation: 1, total: 151, seen: 2, used: 2 });
    expect(rows[1]).toMatchObject({ seen: 1, used: 0, total: 100 });
    expect(rows.reduce((sum, row) => sum + row.total, 0)).toBe(1025);
  });
});

describe("friendly battles and achievement progress", () => {
  it("the leader brings a full team with the signature Pokémon, the same for a seed", () => {
    const pool = snapshotPool();
    const lead = pool.find((p) => p.name === "pikachu");
    const team = friendlyOpponent(pool, "hard", "amistoso", lead, relations);
    expect(team).toHaveLength(TEAM_SIZE);
    expect(team.map((p) => p.name)).toContain(GYMS.hard.battles.at(-1)?.signature);
    expect(team.some((p) => p.legendary)).toBe(false);
    expect(friendlyOpponent(pool, "hard", "amistoso", lead, relations)).toEqual(team);
  });

  it("shows how close you are to building achievements", () => {
    expect(achievementProgress("streak-3", { ...EMPTY_STATS, streak: 2 }, [])).toEqual([2, 3]);
    expect(achievementProgress("both-badges", EMPTY_STATS, ["boulder"])).toEqual([1, 2]);
    expect(achievementProgress("first-win", EMPTY_STATS, [])).toBeUndefined();
  });
});

describe("the legendary loop", () => {
  it("encounters offer uncaught legendaries first", async () => {
    const { snapshotLegendaries } = await import("@/server/pokedex/battle-pool");
    const { encounterOffers } = await import("./battle/draft");
    const { rngFrom } = await import("./battle/rng");
    const pool = [...snapshotPool(), ...snapshotLegendaries()];
    const all = pool.filter((p) => p.legendary).map((p) => p.name);
    const caught = all.filter((name) => name !== "latios");
    const offers = encounterOffers(pool, caught, rngFrom("enc"), GYMS.easy.rules.player);
    expect(offers).toHaveLength(3);
    expect(offers[0]).toBe("latios");
    expect(encounterOffers(pool, [], rngFrom("enc"), 2500).every((n) => all.includes(n))).toBe(
      true,
    );
  });

  it("completing a group pays a Master Ball once", async () => {
    const { catchAndComplete } = await import("./battle/progress");
    const start = { ...EMPTY_STATS, caught: ["articuno", "zapdos"] };
    const done = catchAndComplete(start, "moltres");
    expect(done.completed).toEqual(["birds"]);
    expect(done.stats.balls.master).toBe(1);
    expect(done.stats.legendSets).toEqual(["birds"]);
    const again = catchAndComplete(done.stats, "moltres");
    expect(again.completed).toEqual([]);
    expect(again.stats.balls.master).toBe(1);
  });

  it("a caught legendary called in starts in the first slot", async () => {
    const { startRun } = await import("./battle/run");
    const run = startRun("call", "easy", { summon: "mewtwo" });
    expect(run.picks).toEqual(["mewtwo"]);
    expect(run.summon).toBe("mewtwo");
    // An encounter and a summon don't stack.
    expect(startRun("call", "easy", { summon: "mewtwo", legendary: true }).picks).toEqual([]);
  });
});
