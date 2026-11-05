import { beforeAll, describe, expect, it } from "vitest";
import {
  BATTLES_PER_RUN,
  GYMS,
  RULES_VERSION,
  TEAM_BUDGET,
  TEAM_SIZE,
  type GymMode,
} from "@/config/gym";
import { createFixtureClient } from "@/server/pokeapi/fixtures";
import { snapshotPool } from "@/server/pokedex/battle-pool";
import { createPokedexService } from "@/server/pokedex/service";
import type { BattlePokemon } from "@/types/battle";
import type { TypeRelations } from "@/types/pokemon";
import { bestAttack, levelStats, matchupScore, rollDamage } from "./damage";
import { draftRound } from "./draft";
import { counterPick, generateOpponent, scoutScore } from "./opponents";
import { hashString, mulberry32, rngFrom, shuffle } from "./rng";
import {
  applyResult,
  battleFor,
  countersLead,
  currentDraft,
  gymRunSchema,
  opponentBudget,
  opponentFor,
  pickPokemon,
  reorder,
  reroll,
  startRun,
  trainersFor,
  type GymRun,
} from "./run";
import { simulateBattle } from "./simulate";
import { sharedWeaknesses, teamCoverage } from "../type-effectiveness";
import { budgetPlan, fitsBudget, teamBst, validateTeam } from "./team";

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
  it("covers generations 1 to 4 without legendaries", () => {
    expect(pool).toHaveLength(458);
    expect(Math.max(...pool.map((p) => p.id))).toBeLessThanOrEqual(493);
    expect(pool.some((p) => ["mewtwo", "lugia", "rayquaza", "dialga"].includes(p.name))).toBe(
      false,
    );
    // Cross-generation families stay together (Gen 4 evolutions of older Pokémon).
    expect(get("magmortar").family).toBe(get("magby").family);
    expect(get("garchomp").bst).toBe(600);
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
        const legal = round.offers.filter((o) => !round.blocked.includes(o.name));
        // At least one offer always fits, and blocked ones really don't.
        expect(legal.length).toBeGreaterThan(0);
        for (const name of round.blocked) {
          const offer = round.offers.find((o) => o.name === name) as BattlePokemon;
          expect(fitsBudget(offer, team, pool)).toBe(false);
        }
        team.push(legal[Math.floor(rng() * legal.length)] as BattlePokemon);
      }
      expect(validateTeam(team)).toEqual([]);
      expect(teamBst(team)).toBeLessThanOrEqual(TEAM_BUDGET);
    }
  });

  it("shows strong offers that don't fit instead of hiding them", () => {
    // Two 600s already: most strong offers can no longer fit, and some round must show one blocked.
    const team = ["dragonite", "tyranitar", "metagross"].map(get);
    const blocked = Array.from({ length: 30 }, (_, seed) =>
      draftRound(pool, team, rngFrom("blk", seed)),
    ).flatMap((round) => round.blocked);
    expect(blocked.length).toBeGreaterThan(0);
  });

  it("easy mode (no cap) never blocks an offer", () => {
    const team = ["dragonite", "tyranitar", "metagross", "garchomp", "salamence"].map(get);
    for (let seed = 0; seed < 30; seed++) {
      expect(draftRound(pool, team, rngFrom("easy", seed), null).blocked).toEqual([]);
    }
  });

  it("the die prefers types the team doesn't have and always lands on a viable type", () => {
    for (let seed = 0; seed < 100; seed++) {
      const team: BattlePokemon[] = [];
      for (let r = 0; r < TEAM_SIZE; r++) {
        const round = draftRound(pool, team, rngFrom("die", seed, r), null);
        const covered = new Set(team.flatMap((p) => p.types));
        // With so many types available, the die never repeats one the team already has.
        expect(covered.has(round.type)).toBe(false);
        // A viable face: three offers, and at least one is mid or strong.
        expect(round.offers).toHaveLength(3);
        expect(round.offers.some((o) => o.types.includes(round.type))).toBe(true);
        team.push(round.offers.at(-1) as BattlePokemon);
      }
      expect(validateTeam(team)).toEqual([]);
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

  it("counter-pick opens with the best answer to your lead and keeps the rest in order", () => {
    const team = ["pidgey", "geodude", "squirtle", "caterpie"].map(get);
    // Against Charmander (fire), Geodude (rock) and Squirtle (water) both hit 2× and resist fire:
    // the tie keeps the generated order, so Geodude opens.
    const picked = counterPick(team, get("charmander"), relations);
    expect(picked.map((p) => p.name)).toEqual(["geodude", "pidgey", "squirtle", "caterpie"]);
    // Against Bulbasaur (grass), only Pidgey (flying) has the edge.
    expect(counterPick(team, get("bulbasaur"), relations)[0]?.name).toBe("pidgey");
    expect(counterPick(team, undefined, relations)).toEqual(team);
  });
});

describe("gym run", () => {
  function draftAll(run: GymRun, choose: (offers: BattlePokemon[]) => BattlePokemon) {
    let current = run;
    while (current.phase === "draft") {
      const round = currentDraft(current, pool);
      const legal = round.offers.filter((o) => !round.blocked.includes(o.name));
      current = pickPokemon(current, choose(legal).name, pool);
    }
    return current;
  }

  it("drafts, battles and ends with a badge or a defeat", () => {
    let run = draftAll(startRun("abc"), (offers) => offers.at(-1) as BattlePokemon);
    expect(run.phase).toBe("ready");
    expect(run.picks).toHaveLength(6);
    expect(opponentFor(run, 0, pool, relations)).toHaveLength(6);
    while (run.phase === "ready")
      run = applyResult(run, battleFor(run, pool, relations), pool, relations);
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

  type Strategy = "random" | "strongest" | "expert";

  /** What a thoughtful player drafts: strong, new types, no stacked weaknesses. */
  function expertPick(team: BattlePokemon[], offers: BattlePokemon[]) {
    const value = (p: BattlePokemon) => {
      const covered = new Set(team.flatMap((t) => t.types));
      const fresh = p.types.filter((t) => !covered.has(t)).length;
      const shared = sharedWeaknesses(
        teamCoverage(
          [...team, p].map((t) => t.types),
          relations,
        ),
      ).length;
      return p.bst + 40 * fresh - 50 * shared;
    };
    return offers.reduce((best, p) => (value(p) > value(best) ? p : best));
  }

  /**
   * Clear rate for a strategy: random picks; always the strongest legal offer; or "expert" (drafts
   * for coverage, then opens each battle with the best matchup against the opponent's lead,
   * enumerating every lead so counter-picking trainers are accounted for).
   */
  function clearRate(mode: GymMode, strategy: Strategy, runs = 60) {
    const map = new Map(pool.map((p) => [p.name, p]));
    let firstWins = 0;
    let cleared = 0;
    for (let i = 0; i < runs; i++) {
      const rng = rngFrom("balance", mode, strategy, i);
      let run = startRun(`balance-${i}`, mode);
      while (run.phase === "draft") {
        const round = currentDraft(run, pool);
        const legal = round.offers.filter((o) => !round.blocked.includes(o.name));
        const team = run.picks.map(get);
        const choice =
          strategy === "random"
            ? (legal[Math.floor(rng() * legal.length)] as BattlePokemon)
            : strategy === "expert"
              ? expertPick(team, legal)
              : (legal.at(-1) as BattlePokemon);
        run = pickPokemon(run, choice.name, pool);
      }
      while (run.phase === "ready") {
        if (strategy === "expert") {
          const ready = run;
          const options = run.picks.map((lead) =>
            reorder(ready, [lead, ...ready.picks.filter((name) => name !== lead)]),
          );
          const score = (option: GymRun) => {
            const lead = map.get(option.order[0] ?? "") as BattlePokemon;
            const opponentLead = opponentFor(option, option.battle, pool, relations)[0];
            return opponentLead ? matchupScore(lead, opponentLead, relations) * 1000 + lead.bst : 0;
          };
          run = options.reduce((best, option) => (score(option) > score(best) ? option : best));
        }
        run = applyResult(run, battleFor(run, pool, relations), pool, relations);
        if (run.battle === 1 && run.history.length === 1) firstWins++;
      }
      if (run.phase === "won") cleared++;
    }
    return { first: firstWins / runs, cleared: cleared / runs };
  }

  it("is a real challenge in every mode, and playing well pays off", () => {
    const modes = ["easy", "hard", "daily"] as const;
    const strategies = ["random", "strongest", "expert"] as const;
    const rates = Object.fromEntries(
      modes.flatMap((mode) =>
        strategies.map((strategy) => [`${mode}-${strategy}`, clearRate(mode, strategy)]),
      ),
    ) as Record<`${GymMode}-${Strategy}`, { first: number; cleared: number }>;
    console.error(
      "balance:",
      Object.entries(rates)
        .map(([key, rate]) => `${key} ${Math.round(rate.cleared * 100)}%`)
        .join(", "),
    );
    // Targets from project-goal.md §8.9 (bands, with slack for 60 runs per row).
    expect(rates["easy-random"].first).toBeGreaterThanOrEqual(0.5);
    expect(rates["easy-random"].cleared).toBeLessThanOrEqual(0.15);
    expect(rates["easy-expert"].cleared).toBeGreaterThanOrEqual(0.15);
    expect(rates["easy-expert"].cleared).toBeLessThanOrEqual(0.5);
    expect(rates["hard-expert"].cleared).toBeLessThanOrEqual(0.25);
    expect(rates["daily-expert"].cleared).toBeLessThanOrEqual(0.4);
    for (const mode of modes) {
      // Nobody clears a mode by drafting at random, and thinking beats random drafting.
      expect(rates[`${mode}-random`].cleared).toBeLessThanOrEqual(0.15);
      expect(rates[`${mode}-expert`].cleared).toBeGreaterThan(rates[`${mode}-random`].cleared);
    }
    // Easy is the easiest for anyone playing with intent.
    expect(rates["hard-expert"].cleared).toBeLessThan(rates["easy-expert"].cleared);
    expect(rates["daily-expert"].cleared).toBeLessThan(rates["easy-expert"].cleared);
  }, 600_000);

  it("opponents scale per battle and leaders counter your lead", () => {
    const run = draftAll(startRun("follow", "easy"), (offers) => offers.at(-1) as BattlePokemon);
    const rules = GYMS.easy.rules;
    const team = teamBst(run.picks.map(get));
    const expected = rules.opponents + rules.follow * (team - rules.opponents);
    expect(opponentBudget(run, 3, pool)).toBe(
      Math.round(expected * (GYMS.easy.battles[3]?.budgetFactor ?? 1)),
    );
    // Battle 5 (Brock) counter-picks in easy mode too; battle 1 doesn't.
    expect(countersLead(run, 4)).toBe(true);
    expect(countersLead(run, 0)).toBe(false);
    expect(countersLead({ ...run, mode: "hard" }, 0)).toBe(true);
  });

  it("leaders and bosses bring their signature Pokémon", () => {
    for (const mode of ["easy", "hard", "daily"] as const) {
      const run = draftAll(
        startRun(`sig-${mode}`, mode),
        (offers) => offers.at(-1) as BattlePokemon,
      );
      GYMS[mode].battles.forEach((battle, index) => {
        const opponent = opponentFor(run, index, pool, relations);
        expect(validateTeam(opponent)).toEqual([]);
        if (battle.signature) expect(opponent.map((p) => p.name)).toContain(battle.signature);
      });
    }
  });

  it("scouting trainers build teams that counter yours", () => {
    const team = ["charizard", "arcanine", "rapidash", "ninetales", "magmar", "flareon"].map(get);
    let random = 0;
    let scouted = 0;
    for (let seed = 0; seed < 40; seed++) {
      const plain = generateOpponent(pool, 2500, rngFrom("scout", seed));
      const studied = generateOpponent(pool, 2500, rngFrom("scout", seed), TEAM_SIZE, {
        scouting: { team, relations, focus: 1 },
      });
      random += plain.reduce((sum, p) => sum + scoutScore(p, team, relations), 0);
      scouted += studied.reduce((sum, p) => sum + scoutScore(p, team, relations), 0);
      expect(validateTeam(studied)).toEqual([]);
      expect(teamBst(studied)).toBeLessThanOrEqual(2500);
    }
    expect(scouted).toBeGreaterThan(random * 2);
  });

  it("names trainers per run: fixed leaders, drawn classes and names, no repeats", () => {
    const a = trainersFor(startRun("names-a", "easy"));
    const b = trainersFor(startRun("names-b", "easy"));
    expect(a).toHaveLength(5);
    expect(a.at(-1)).toBe("Brock");
    expect(new Set(a).size).toBe(5);
    expect(a).not.toEqual(b);
    expect(trainersFor(startRun("names-a", "easy"))).toEqual(a);
    const rocket = trainersFor(startRun("dia-2026-11-05", "daily"));
    expect(rocket.slice(-2)).toEqual(["James", "Jessie"]);
    expect(rocket[0]).toMatch(/^Recruta Rocket /);
    expect(trainersFor(startRun("x", "hard")).at(-1)).toBe("Misty");
  });

  it("starts runs under the current rules version", () => {
    expect(startRun("v").rules).toBe(RULES_VERSION);
    // Saved v1 runs (no version) parse as version 1, so the UI can discard them.
    const legacy: Partial<GymRun> = startRun("old");
    delete legacy.rules;
    expect(gymRunSchema.parse(legacy).rules).toBe(1);
  });

  it("records damage and the opponent's MVP for every battle", () => {
    let run = draftAll(startRun("mvp"), (offers) => offers.at(-1) as BattlePokemon);
    run = applyResult(run, battleFor(run, pool, relations), pool, relations);
    const record = run.history[0];
    expect(Object.keys(record?.damage ?? {})).toHaveLength(6);
    expect(Object.values(record?.damage ?? {}).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });

  it("every mode has five battles with its leader last", () => {
    expect(GYMS.easy.battles.at(-1)).toMatchObject({ trainer: "Brock", leader: true });
    expect(GYMS.hard.battles.at(-1)).toMatchObject({ trainer: "Misty", leader: true });
    expect(GYMS.daily.battles.at(-1)).toMatchObject({ trainer: "Jessie", leader: true });
    for (const gym of Object.values(GYMS)) {
      expect(gym.battles).toHaveLength(BATTLES_PER_RUN);
      for (const battle of gym.battles) {
        if (battle.signature) expect(pool.some((p) => p.name === battle.signature)).toBe(true);
      }
    }
  });
});
