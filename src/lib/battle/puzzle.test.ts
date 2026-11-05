import { beforeAll, describe, expect, it } from "vitest";
import { ROCKET_PUZZLE } from "@/config/gym";
import { createFixtureClient } from "@/server/pokeapi/fixtures";
import { snapshotPool } from "@/server/pokedex/battle-pool";
import { createPokedexService } from "@/server/pokedex/service";
import type { TypeRelations } from "@/types/pokemon";
import { pastDays } from "./progress";
import {
  EMPTY_ROCKET,
  addAttempt,
  attemptBattle,
  calibrate,
  orderedTeams,
  rocketGrid,
  rocketReward,
  rocketShareText,
  toAttempt,
  type RocketAttempt,
} from "./puzzle";
import { teamBst } from "./team";

const pool = snapshotPool();
let relations: TypeRelations;

beforeAll(async () => {
  relations = await createPokedexService(createFixtureClient()).getTypeRelations();
});

describe("the daily Rocket ambush", () => {
  it("is the same puzzle for everyone on a day: a hand, and Jessie and James's aces", () => {
    const puzzle = calibrate(pool, relations, "2026-11-05");
    expect(calibrate(pool, relations, "2026-11-05")).toBe(puzzle);
    expect(puzzle.hand).toHaveLength(ROCKET_PUZZLE.hand);
    expect(puzzle.opponent).toHaveLength(ROCKET_PUZZLE.opponents);
    expect(puzzle.opponent.map((p) => p.name)).toEqual(
      expect.arrayContaining([...ROCKET_PUZZLE.signatures]),
    );
    // No family on both sides, no legendaries.
    const theirs = new Set(puzzle.opponent.map((p) => p.family));
    expect(puzzle.hand.some((p) => theirs.has(p.family))).toBe(false);
    expect([...puzzle.hand, ...puzzle.opponent].some((p) => p.legendary)).toBe(false);
  });

  it("only offers legal teams: different Pokémon, in order, within the cap", () => {
    const { hand } = calibrate(pool, relations, "2026-11-05");
    const teams = orderedTeams(hand);
    expect(teams.length).toBeGreaterThan(0);
    for (const team of teams) {
      expect(team).toHaveLength(ROCKET_PUZZLE.pick);
      expect(new Set(team.map((p) => p.name)).size).toBe(ROCKET_PUZZLE.pick);
      expect(teamBst(team)).toBeLessThanOrEqual(ROCKET_PUZZLE.cap);
    }
    // The cap is a real choice: not every team fits.
    expect(teams.length).toBeLessThan(8 * 7 * 6);
  });

  it("is calibrated: every day, a fair share of the legal teams wins", () => {
    const [low, high] = ROCKET_PUZZLE.winRange;
    const rates = pastDays("2026-12-01", 30).map((day) => calibrate(pool, relations, day).winRate);
    console.error(
      `rocket ambush win rates: min ${Math.min(...rates).toFixed(2)}, max ${Math.max(...rates).toFixed(2)}`,
    );
    for (const rate of rates) {
      expect(rate).toBeGreaterThanOrEqual(low);
      expect(rate).toBeLessThanOrEqual(high);
    }
  }, 120_000);

  it("plays the same team the same way, and a different order can change the outcome", () => {
    const puzzle = calibrate(pool, relations, "2026-11-05");
    const teams = orderedTeams(puzzle.hand);
    const team = teams[0] ?? [];
    expect(attemptBattle(puzzle, team, relations)).toEqual(attemptBattle(puzzle, team, relations));
    const outcomes = new Set(teams.map((t) => attemptBattle(puzzle, t, relations).winner));
    expect(outcomes).toEqual(new Set(["player", "opponent"]));
  });

  it("records attempts, closes the day on a win or the last miss, and rewards speed", () => {
    const puzzle = calibrate(pool, relations, "2026-11-05");
    const team = orderedTeams(puzzle.hand)[0] ?? [];
    const attempt = toAttempt(team, puzzle.opponent, attemptBattle(puzzle, team, relations));
    expect(attempt.order).toEqual(team.map((p) => p.name));

    const miss: RocketAttempt = { order: ["a"], won: false, knocked: 1, nemesis: "arbok" };
    const hit: RocketAttempt = { order: ["b"], won: true, knocked: 4 };
    let progress = addAttempt(EMPTY_ROCKET, "2026-11-05", miss);
    expect(progress.days[0]?.result).toBeUndefined();
    progress = addAttempt(progress, "2026-11-05", hit);
    expect(progress.days[0]?.result).toBe("won");
    // A closed day is final.
    expect(addAttempt(progress, "2026-11-05", miss)).toBe(progress);

    let lost = EMPTY_ROCKET;
    for (let i = 0; i < ROCKET_PUZZLE.attempts; i++) lost = addAttempt(lost, "2026-11-06", miss);
    expect(lost.days[0]?.result).toBe("lost");

    expect(rocketReward(1, true)).toBe("ultra");
    expect(rocketReward(2, true)).toBe("great");
    expect(rocketReward(3, true)).toBe("poke");
    expect(rocketReward(3, false)).toBeUndefined();

    const day = progress.days[0]!;
    expect(rocketGrid(day.attempts, 4)).toEqual(["🟩🟥🟥🟥", "🟩🟩🟩🟩"]);
    expect(rocketShareText(day, "https://x.dev", "Emboscada Rocket")).toBe(
      "Emboscada Rocket 05/11 · 2/3\n🟩🟥🟥🟥\n🟩🟩🟩🟩\nhttps://x.dev/gym",
    );
  });
});
