import { beforeAll, describe, expect, it } from "vitest";
import { GYMS, TEAM_SIZE } from "@/config/gym";
import { createFixtureClient } from "@/server/pokeapi/fixtures";
import { snapshotPool } from "@/server/pokedex/battle-pool";
import { createPokedexService } from "@/server/pokedex/service";
import type { BattlePokemon } from "@/types/battle";
import type { TypeRelations } from "@/types/pokemon";
import { evolutionOf, evolveItems, rerollItems, trained } from "./items";
import {
  addBonusReroll,
  applyResult,
  battleFor,
  chooseReplacementPick,
  chooseReward,
  currentDraft,
  evolveMember,
  opponentRevealed,
  pickPokemon,
  playerTeam,
  reroll,
  rerollsLeft,
  rewardItem,
  startBattle,
  startRun,
  type GymRun,
} from "./run";
import { simulateBattle } from "./simulate";

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

/** A run drafted with the strongest legal offer each round, ready for battle 1. */
function readyRun(seed: string, mode: "easy" | "hard" = "easy"): GymRun {
  let run = startRun(seed, mode);
  while (run.phase === "draft") {
    const round = currentDraft(run, pool);
    const legal = round.offers.filter((o) => !round.blocked.includes(o.name));
    run = pickPokemon(run, (legal.at(-1) as BattlePokemon).name, pool);
  }
  return run;
}

describe("items: evolution and rerolls", () => {
  it("evolves to the nearest stage; stones need a matching type, the Rare Candy doesn't", () => {
    expect(evolutionOf(get("charmander"), pool)?.name).toBe("charmeleon");
    expect(evolutionOf(get("charmander"), pool, "fire-stone")?.name).toBe("charmeleon");
    expect(evolutionOf(get("charmander"), pool, "water-stone")).toBeUndefined();
    expect(evolutionOf(get("eevee"), pool, "water-stone")?.name).toBe("vaporeon");
    expect(evolutionOf(get("eevee"), pool, "thunder-stone")?.name).toBe("jolteon");
    expect(evolutionOf(get("charizard"), pool)).toBeUndefined();
    expect(evolutionOf(get("pikachu"), pool, "nugget")).toBeUndefined();
  });

  it("lists only the items that can do something for the team", () => {
    const team = [get("charmander"), get("pikachu")];
    const bag = {
      "fire-stone": 1,
      "water-stone": 2,
      "thunder-stone": 1,
      nugget: 1,
      "rare-candy": 0,
    };
    expect(evolveItems(bag, team, pool).sort()).toEqual(["fire-stone", "thunder-stone"]);
    expect(rerollItems(bag)).toEqual(["nugget"]);
  });

  it("training raises attacks and speed, not the stat total used for budgets", () => {
    const pikachu = get("pikachu");
    const boosted = trained(pikachu);
    expect(boosted.stats.speed).toBeGreaterThan(pikachu.stats.speed);
    expect(boosted.stats.attack).toBeGreaterThan(pikachu.stats.attack);
    expect(boosted.stats.hp).toBe(pikachu.stats.hp);
    expect(boosted.bst).toBe(pikachu.bst);
  });

  it("a valuable buys one more reroll in the draft", () => {
    let run = reroll(startRun("bonus"));
    expect(rerollsLeft(run)).toBe(0);
    run = addBonusReroll(run);
    expect(rerollsLeft(run)).toBe(1);
    expect(reroll(run).rerollsUsed).toBe(2);
  });
});

describe("rewards between battles", () => {
  /** Wins battles (trying each lead) until one is won; returns the run after it. */
  function afterAWin(seed: string, mode: "easy" | "hard" = "easy"): GymRun | undefined {
    const run = readyRun(seed, mode);
    for (const lead of run.picks) {
      const ordered = { ...run, order: [lead, ...run.picks.filter((n) => n !== lead)] };
      const next = applyResult(ordered, battleFor(ordered, pool, relations), pool, relations);
      if (next.phase === "ready") return next;
    }
    return undefined;
  }

  it("a won battle offers three rewards that must be settled before the next one", () => {
    const run = afterAWin("reward-1");
    expect(run?.reward).toEqual({ battle: 1, options: ["train", "item", "evolve"] });
    if (!run) return;
    // The next battle can't start while a reward is pending.
    expect(startBattle(run)).toBe(run);
    const target = run.picks[0] ?? "";
    const trainedRun = chooseReward(run, "train", pool, target);
    expect(trainedRun.reward).toBeUndefined();
    expect(trainedRun.boosts).toEqual([target]);
    expect(
      playerTeam(trainedRun, pool).find((p) => p.name === target)?.stats.speed,
    ).toBeGreaterThan(get(target).stats.speed);
    // Skipping is fine too; the item reward is the same for a seed and battle.
    expect(chooseReward(run, undefined, pool).reward).toBeUndefined();
    expect(rewardItem(run, 1)).toBe(rewardItem(run, 1));
  });

  it("hard mode offers scouting, which reveals the next hidden team", () => {
    const run = afterAWin("reward-hard", "hard") ?? afterAWin("reward-hard-2", "hard");
    expect(run?.reward?.options).toContain("scout");
    if (!run) return;
    expect(opponentRevealed(run)).toBe(false);
    expect(opponentRevealed(chooseReward(run, "scout", pool))).toBe(true);
  });

  it("evolving keeps the slot, the order and the training", () => {
    let run = readyRun("evolve");
    const name = run.picks.find((n) => evolutionOf(get(n), pool));
    if (!name) return;
    run = { ...run, boosts: [name] };
    const evolved = evolveMember(run, name, "rare-candy", pool);
    const to = evolutionOf(get(name), pool)?.name ?? "";
    expect(evolved.picks.indexOf(to)).toBe(run.picks.indexOf(name));
    expect(evolved.boosts).toEqual([to]);
    expect(evolved.evolved).toEqual([{ from: name, to }]);
    expect(evolved.picks).toHaveLength(TEAM_SIZE);
  });
});

describe("battle choices and fields", () => {
  it("records each replacement decision; a pick replays the same battle up to it", () => {
    const team = ["charizard", "blastoise", "venusaur", "pikachu"].map(get);
    const opponent = ["golem", "starmie", "gengar", "dragonite"].map(get);
    const auto = simulateBattle(team, opponent, relations, "choices");
    const point = auto.choicePoints[0];
    expect(point).toBeDefined();
    if (!point) return;
    expect(point.chosen).toBe(point.auto);
    const other = point.options.find((i) => i !== point.auto) ?? point.auto;
    const picked = simulateBattle(team, opponent, relations, "choices", { choices: [other] });
    expect(picked.events.slice(0, point.event + 1)).toEqual(auto.events.slice(0, point.event + 1));
    expect(picked.events[point.event + 1]).toEqual({ kind: "send", side: "player", index: other });
    // An invalid pick falls back to the best matchup.
    const invalid = simulateBattle(team, opponent, relations, "choices", { choices: [99] });
    expect(invalid.events).toEqual(auto.events);
  });

  it("a field scales typed damage", () => {
    const water = [get("blastoise")];
    const target = [get("snorlax")];
    const firstHit = (field?: Record<string, number>) =>
      simulateBattle(water, target, relations, "rain", field ? { field } : {}).events.find(
        (e) => e.kind === "attack" && e.side === "player",
      );
    const dry = firstHit();
    const rain = firstHit({ water: 1.5 });
    expect(dry?.kind === "attack" && rain?.kind === "attack").toBe(true);
    if (dry?.kind === "attack" && rain?.kind === "attack")
      expect(rain.damage).toBe(Math.floor(dry.damage * 1.5));
    expect(GYMS.hard.field?.water).toBeGreaterThan(1);
  });

  it("a battle in progress is saved with its choices", () => {
    const run = readyRun("battling");
    const started = startBattle(run);
    expect(started.battling).toEqual({ choices: [] });
    expect(chooseReplacementPick(started, 2).battling).toEqual({ choices: [2] });
    const after = applyResult(started, battleFor(started, pool, relations), pool, relations);
    expect(after.battling).toBeUndefined();
  });
});
