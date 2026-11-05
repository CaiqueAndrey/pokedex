import { describe, expect, it } from "vitest";
import { QUIZ_DAILY_GENERATIONS, QUIZ_MAX_GUESSES } from "@/config/quiz";
import type { PokemonSummary } from "@/types/pokemon";
import {
  EMPTY_QUIZ,
  addGuess,
  compareGuess,
  dailyAnswer,
  dayGrid,
  decodeImageToken,
  encodeImageToken,
  hintsFor,
  matchGuess,
  quizPool,
  quizReward,
  quizShareText,
  quizStatus,
  suggestions,
  type QuizEntry,
} from "./quiz";
import { playedDays } from "./battle/progress";

const entry = (
  id: number,
  name: string,
  types: QuizEntry["types"],
  generation: number,
): QuizEntry => ({ id, name, types, generation });

const pikachu = entry(25, "pikachu", ["electric"], 1);
const raichu = entry(26, "raichu", ["electric"], 1);
const mrMime = entry(122, "mr-mime", ["psychic", "fairy"], 1);
const pichu = entry(172, "pichu", ["electric"], 2);
const lucario = entry(448, "lucario", ["fighting", "steel"], 4);
const sprigatito = entry(906, "sprigatito", ["grass"], 9);
const pool = [pikachu, raichu, mrMime, pichu, lucario, sprigatito];

describe("quiz pool and the daily answer", () => {
  it("keeps one entry per species, by national number", () => {
    const summary = (over: Partial<PokemonSummary>): PokemonSummary => ({
      id: 25,
      speciesId: 25,
      name: "pikachu",
      speciesName: "pikachu",
      isDefault: true,
      types: ["electric"],
      generation: 1,
      ...over,
    });
    const result = quizPool([
      summary({ id: 26, speciesId: 26, name: "raichu", speciesName: "raichu" }),
      summary({}),
      summary({
        id: 10100,
        speciesId: 26,
        name: "raichu-alola",
        speciesName: "raichu",
        isDefault: false,
      }),
    ]);
    expect(result.map((p) => p.name)).toEqual(["pikachu", "raichu"]);
  });

  it("is the same all day, changes between days and stays in the recognizable generations", () => {
    expect(dailyAnswer(pool, "2026-11-05")).toEqual(dailyAnswer(pool, "2026-11-05"));
    const answers = Array.from({ length: 30 }, (_, i) =>
      dailyAnswer(pool, `2026-10-${String(i + 1).padStart(2, "0")}`),
    );
    const allowed = new Set<number>(QUIZ_DAILY_GENERATIONS);
    expect(answers.every((a) => a && allowed.has(a.generation))).toBe(true);
    expect(new Set(answers.map((a) => a?.name)).size).toBeGreaterThan(1);
  });
});

describe("guessing", () => {
  it("matches names however they are typed", () => {
    expect(matchGuess(pool, "Mr. Mime")).toBe(mrMime);
    expect(matchGuess(pool, "mr mime")).toBe(mrMime);
    expect(matchGuess(pool, "  PIKACHU ")).toBe(pikachu);
    expect(matchGuess(pool, "pika")).toBeUndefined();
  });

  it("suggests names that start with the text first, without the ones already tried", () => {
    expect(suggestions(pool, "chu", 5).map((p) => p.name)).toEqual(["pikachu", "raichu", "pichu"]);
    expect(suggestions(pool, "pi", 5).map((p) => p.name)).toEqual(["pikachu", "pichu"]);
    expect(suggestions(pool, "pi", 5, ["pikachu"]).map((p) => p.name)).toEqual(["pichu"]);
    expect(suggestions(pool, "", 5)).toEqual([]);
  });

  it("compares a wrong guess: shared types and where the answer's generation is", () => {
    expect(compareGuess(pikachu, pichu)).toEqual({
      sharedTypes: ["electric"],
      generation: "higher",
    });
    expect(compareGuess(lucario, pikachu)).toEqual({ sharedTypes: [], generation: "lower" });
    expect(compareGuess(raichu, pikachu).generation).toBe("same");
  });

  it("unlocks a hint per miss", () => {
    expect(hintsFor(mrMime, 0)).toMatchObject({ types: undefined, generation: undefined });
    expect(hintsFor(mrMime, 1).types).toEqual(["psychic", "fairy"]);
    expect(hintsFor(mrMime, 2).generation).toBe(1);
    // "Mr. Mime": letters only.
    expect(hintsFor(mrMime, 3)).toMatchObject({ firstLetter: "M", length: 6 });
    expect(hintsFor(mrMime, 4).clearer).toBe(true);
  });
});

describe("a day's result", () => {
  it("is solved by the answer and failed after the last guess", () => {
    expect(quizStatus(["raichu", "pikachu"], pikachu)).toBe("solved");
    expect(quizStatus(["raichu"], pikachu)).toBe("playing");
    const misses = ["raichu", "pichu", "mr-mime", "lucario", "sprigatito"];
    expect(quizStatus(misses, pikachu)).toBe("failed");
    expect(quizStatus(["raichu", "pichu", "mr-mime"], pikachu, 3)).toBe("failed");
  });

  it("saves guesses, closes the day once and ignores repeats", () => {
    let progress = addGuess(EMPTY_QUIZ, "2026-11-05", "raichu", pikachu);
    progress = addGuess(progress, "2026-11-05", "raichu", pikachu);
    expect(progress.days[0]?.guesses).toEqual(["raichu"]);
    progress = addGuess(progress, "2026-11-05", "pikachu", pikachu);
    expect(progress.days[0]).toMatchObject({ result: "solved", guesses: ["raichu", "pikachu"] });
    // A finished day takes no more guesses.
    expect(addGuess(progress, "2026-11-05", "pichu", pikachu)).toBe(progress);
    expect(dayGrid(progress.days[0]!)).toBe("🟥🟩");
  });

  it("fails the day after the last miss", () => {
    let progress = EMPTY_QUIZ;
    for (const name of ["raichu", "pichu", "mr-mime", "lucario", "sprigatito"])
      progress = addGuess(progress, "2026-11-05", name, pikachu);
    expect(progress.days[0]?.result).toBe("failed");
    expect(progress.days[0]?.guesses).toHaveLength(QUIZ_MAX_GUESSES);
    expect(dayGrid(progress.days[0]!)).toBe("🟥🟥🟥🟥🟥");
  });

  it("rewards quick solves with a Great Ball and shares a spoiler-free grid", () => {
    expect(quizReward(1, true)).toBe("great");
    expect(quizReward(2, true)).toBe("great");
    expect(quizReward(3, true)).toBe("poke");
    expect(quizReward(5, false)).toBeUndefined();
    const text = quizShareText("2026-11-05", ["raichu", "pikachu"], pikachu, "https://x.dev");
    expect(text).toBe("Quem é esse Pokémon? 05/11 · 2/5\n🟥🟩\nhttps://x.dev/quiz");
    expect(text).not.toContain("Pikachu");
  });
});

describe("image tokens", () => {
  it("round-trip every national number and reject anything else", () => {
    for (const id of [1, 25, 493, 1025]) expect(decodeImageToken(encodeImageToken(id))).toBe(id);
    expect(encodeImageToken(25)).not.toContain("25");
    expect(decodeImageToken("25")).toBeUndefined();
    expect(decodeImageToken("../etc")).toBeUndefined();
    expect(decodeImageToken(encodeImageToken(1026))).toBeUndefined();
  });
});

describe("played days (streak across daily games)", () => {
  it("merges the gym's daily results with other games, once per day", () => {
    const days = playedDays(
      [
        { date: "2026-11-03", won: false, battlesWon: 1 },
        { date: "2026-11-04", won: false, battlesWon: 0 },
      ],
      ["2026-11-04", "2026-11-05"],
    );
    expect(days.map((d) => d.date)).toEqual(["2026-11-03", "2026-11-04", "2026-11-05"]);
  });
});
