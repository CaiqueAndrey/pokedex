import { beforeAll, describe, expect, it } from "vitest";
import { GYM, TEAM_BUDGET, TEAM_SIZE } from "@/config/gym";
import { createFixtureClient } from "@/server/pokeapi/fixtures";
import { snapshotPool } from "@/server/pokedex/battle-pool";
import { createPokedexService } from "@/server/pokedex/service";
import type { BattlePokemon } from "@/types/battle";
import type { TypeRelations } from "@/types/pokemon";
import { bestAttack, levelStats, rollDamage } from "./damage";
import { draftRound } from "./draft";
import { generateOpponent } from "./opponents";
import { hashString, mulberry32, rngFrom, shuffle } from "./rng";
import {
  applyResult,
  battleFor,
  currentDraft,
  opponentFor,
  pickPokemon,
  reorder,
  reroll,
  startRun,
  type GymRun,
} from "./run";
import { simulateBattle } from "./simulate";
import { budgetPlan, teamBst, validateTeam } from "./team";

const pool = snapshotPool();
const get = (name: string) => {
  const pokemon = pool.find((p) => p.name === name);
  if (!pokemon) throw new Error(`${name} not in pool`);
  return pokemon;
};
let relations: TypeRelations;

beforeAll(async () => {
  relations = await createPokedexService(createFixtureClient()).getTypeRelations();
});

describe("rng", () => {
  it("is deterministic per seed and spreads values", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const values = Array.from({ length: 5 }, () => a());
    expect(values).toEqual(Array.from({ length: 5 }, () => b()));
    expect(new Set(values).size).toBe(5);
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(hashString("abc")).toBe(hashString("abc"));
    expect(hashString("abc")).not.toBe(hashString("abd"));
  });

  it("shuffles without losing items", () => {
    expect(shuffle(rngFrom("x"), [1, 2, 3, 4]).sort()).toEqual([1, 2, 3, 4]);
  });
});

describe("pool snapshot", () => {
  it("covers generations 1 and 2 without legendaries", () => {
    expect(pool).toHaveLength(240);
    expect(pool.some((p) => p.name === "mewtwo" || p.name === "lugia")).toBe(false);
    expect(get("pichu").family).toBe(get("raichu").family);
    expect(get("onix").family).toBe(get("steelix").family);
    expect(get("pichu").baby).toBe(true);
    expect(get("tyranitar").bst).toBe(600);
  });
});

describe("damage", () => {
  it("computes level-50 stats like the games", () => {
    // Pikachu base HP 35 → (70+31)·50/100 = 50 → 50 + 60 = 110
    expect(levelStats(get("pikachu").stats).hp).toBe(110);
  });

  it("attacks with the most effective own type", () => {
    // Charizard (fire/flying) vs Venusaur (grass/poison): fire and flying are both 2×
    expect(bestAttack(get("charizard"), get("venusaur"), relations).effectiveness).toBe(2);
    // Gyarados (water/flying) vs Golem (rock/ground): water is 4×
    expect(bestAttack(get("gyarados"), get("golem"), relations)).toMatchObject({
      type: "water",
      effectiveness: 4,
    });
  });

  it("type advantage beats similar stats; immunity falls back to Struggle", () => {
    const rng = mulberry32(1);
    const strong = rollDamage(get("blastoise"), get("arcanine"), relations, rng).damage;
    const weak = rollDamage(get("arcanine"), get("blastoise"), relations, rng).damage;
    expect(strong).toBeGreaterThan(weak * 2);
    // Normal can't touch Ghost
    expect(rollDamage(get("tauros"), get("gengar"), relations, rng)).toMatchObject({
      damage: 1,
      struggle: true,
    });
  });
});

describe("simulateBattle", () => {
  const team = (names: string[]) => names.map(get);

  it("is reproducible for a seed and always ends", () => {
    const a = team(["charizard", "blastoise", "venusaur", "pikachu", "snorlax", "alakazam"]);
    const b = team(["golem", "onix", "rhydon", "omastar", "kabutops", "aerodactyl"]);
    const first = simulateBattle(a, b, relations, "seed-1");
    expect(simulateBattle(a, b, relations, "seed-1")).toEqual(first);
    expect(first.events.at(-1)).toEqual({ kind: "end", winner: first.winner });
    const faints = first.events.filter((e) => e.kind === "faint" && e.side !== first.winner);
    expect(faints).toHaveLength(6);
  });

  it("type advantage with similar stats usually wins", () => {
    const water = team(["blastoise"]);
    const fire = team(["charizard"]);
    const wins = Array.from({ length: 50 }, (_, i) =>
      simulateBattle(water, fire, relations, i),
    ).filter((r) => r.winner === "player").length;
    expect(wins).toBeGreaterThanOrEqual(40);
  });

  it("finishes even when neither side can hurt the other", () => {
    const result = simulateBattle(team(["gengar"]), team(["snorlax"]), relations, 7);
    expect(result.events.at(-1)?.kind).toBe("end");
  });
});

describe("team rules", () => {
  it("rejects duplicates and two members of a family", () => {
    const base = ["pikachu", "squirtle", "charmander", "bulbasaur", "eevee", "onix"].map(get);
    expect(validateTeam(base)).toEqual([]);
    expect(validateTeam([...base.slice(0, 5), get("blastoise")])).toContain("family");
    expect(validateTeam([...base.slice(0, 5), get("pikachu")])).toEqual(
      expect.arrayContaining(["duplicate", "family"]),
    );
    expect(validateTeam([...base.slice(0, 4), get("onix"), get("steelix")])).toContain("family");
    expect(validateTeam([...base.slice(0, 5), get("pichu")])).toContain("family");
  });
});

describe("budget plan", () => {
  it("splits the budget into used, reserved for the next slots and free", () => {
    const empty = budgetPlan([], pool);
    expect(empty.used).toBe(0);
    expect(empty.slotsAfter).toBe(5);
    expect(empty.used + empty.reserved + empty.free).toBe(TEAM_BUDGET);

    const team = ["dragonite", "tyranitar"].map(get);
    const plan = budgetPlan(team, pool);
    expect(plan.used).toBe(1200);
    expect(plan.slotsAfter).toBe(3);
    // Every offer this round fits in what's free.
    const round = draftRound(pool, team, rngFrom("plan"));
    for (const offer of round.offers) expect(offer.bst).toBeLessThanOrEqual(plan.free);
  });
});

describe("draft", () => {
  it("offers up to 3 Pokémon, never a family already on the team, within budget", () => {
    for (let seed = 0; seed < 200; seed++) {
      const rng = rngFrom("draft-test", seed);
      const team: BattlePokemon[] = [];
      while (team.length < TEAM_SIZE) {
        const round = draftRound(pool, team, rng);
        expect(round.offers.length).toBeGreaterThan(0);
        expect(round.offers.length).toBeLessThanOrEqual(3);
        expect(new Set(round.offers.map((o) => o.family)).size).toBe(round.offers.length);
        for (const offer of round.offers) {
          expect(team.some((t) => t.family === offer.family)).toBe(false);
        }
        team.push(round.offers[Math.floor(rng() * round.offers.length)] as BattlePokemon);
      }
      expect(validateTeam(team)).toEqual([]);
      expect(teamBst(team)).toBeLessThanOrEqual(TEAM_BUDGET);
    }
  });

  it("mostly offers the rolled type", () => {
    const round = draftRound(pool, [], rngFrom("type-check"));
    expect(round.offers.some((o) => o.types.includes(round.type))).toBe(true);
  });
});

describe("opponents", () => {
  it("are valid teams near the budget, with no type bias", () => {
    const types = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      const team = generateOpponent(pool, 2400, rngFrom("opp-test", seed));
      expect(validateTeam(team)).toEqual([]);
      expect(teamBst(team)).toBeLessThanOrEqual(2400);
      expect(teamBst(team)).toBeGreaterThanOrEqual(2400 * 0.9);
      team.forEach((p) => p.types.forEach((t) => types.add(t)));
    }
    // Every type shows up, including fairy: the API uses modern typings (Clefairy is Fairy).
    expect(types.size).toBe(18);
  });
});

describe("gym run", () => {
  function draftAll(run: GymRun, choose: (offers: BattlePokemon[]) => BattlePokemon) {
    let current = run;
    while (current.phase === "draft") {
      current = pickPokemon(current, choose(currentDraft(current, pool).offers).name, pool);
    }
    return current;
  }

  it("drafts, battles and ends with a badge or a defeat", () => {
    let run = draftAll(startRun("abc"), (offers) => offers.at(-1) as BattlePokemon);
    expect(run.phase).toBe("ready");
    expect(run.picks).toHaveLength(6);
    expect(opponentFor(run, 0, pool)).toHaveLength(6);
    while (run.phase === "ready") run = applyResult(run, battleFor(run, pool, relations), pool);
    expect(["won", "lost"]).toContain(run.phase);
    // Every battle fought is recorded; only the last one can be a defeat.
    expect(run.history.length).toBe(run.phase === "won" ? 5 : run.battle + 1);
    expect(run.history.slice(0, -1).every((r) => r.won)).toBe(true);
    expect(run.history.at(-1)?.won).toBe(run.phase === "won");
    for (const record of run.history) {
      expect(record.opponent).toHaveLength(6);
      expect(record.won ? record.opponentRemaining : record.remaining).toBe(0);
    }
    // A new run starts with an empty history and keeps the chosen mode.
    expect(startRun("next", "hard")).toMatchObject({ history: [], mode: "hard" });
  });

  it("ignores invalid actions and allows exactly one reroll", () => {
    const run = startRun("xyz");
    expect(pickPokemon(run, "mewtwo", pool)).toBe(run);
    const rerolled = reroll(run);
    expect(rerolled.rerollsUsed).toBe(1);
    expect(reroll(rerolled)).toBe(rerolled);
    expect(reorder(run, ["pikachu"])).toBe(run);
  });

  it("is balanced: battle 1 is usually won, the badge is a challenge", () => {
    const runs = 400;
    let firstWins = 0;
    let badges = 0;
    for (let i = 0; i < runs; i++) {
      const rng = rngFrom("balance", i);
      let run = draftAll(
        startRun(`balance-${i}`),
        (offers) => offers[Math.floor(rng() * offers.length)] as BattlePokemon,
      );
      run = applyResult(run, battleFor(run, pool, relations), pool);
      if (run.battle >= 1) firstWins++;
      while (run.phase === "ready") run = applyResult(run, battleFor(run, pool, relations), pool);
      if (run.phase === "won") badges++;
    }
    const firstRate = firstWins / runs;
    const badgeRate = badges / runs;
    console.error(
      `balance: battle 1 won ${(firstRate * 100).toFixed(1)}%, badge ${(badgeRate * 100).toFixed(1)}%`,
    );
    expect(firstRate).toBeGreaterThanOrEqual(0.6);
    expect(badgeRate).toBeGreaterThanOrEqual(0.1);
    expect(badgeRate).toBeLessThanOrEqual(0.5);
  }, 60_000);

  it("uses the five configured battles, Brock last", () => {
    expect(GYM.battles).toHaveLength(5);
    expect(GYM.battles.at(-1)).toMatchObject({ trainer: "Brock", leader: true });
  });
});
