import { z } from "zod";
import type { Ball } from "@/config/gym";
import {
  QUIZ_DAILY_GENERATIONS,
  QUIZ_GREAT_WITHIN,
  QUIZ_HISTORY,
  QUIZ_MAX_GUESSES,
} from "@/config/quiz";
import { messages } from "@/config/messages";
import type { PokemonSummary, PokemonTypeName } from "@/types/pokemon";
import { hashString } from "./battle/rng";
import { formatName } from "./format";
import { normalizeText } from "./search";

/**
 * "Quem é esse Pokémon?": a silhouette, a few guesses, hints after each miss. Everything here is
 * pure (the answer of a day comes from its date), so the game is the same for everyone and testable.
 */

/** A guessable Pokémon: one per species (default form), by its national number. */
export interface QuizEntry {
  id: number;
  name: string;
  types: [PokemonTypeName] | [PokemonTypeName, PokemonTypeName];
  generation: number;
}

/** One entry per species, ordered by number (alternative forms would make guessing ambiguous). */
export function quizPool(summaries: readonly PokemonSummary[]): QuizEntry[] {
  return summaries
    .filter((p) => p.isDefault)
    .map((p) => ({
      id: p.speciesId,
      name: p.speciesName,
      types: p.types,
      generation: p.generation,
    }))
    .sort((a, b) => a.id - b.id);
}

/** The day's Pokémon (YYYY-MM-DD key), drawn from the recognizable generations. */
export function dailyAnswer(pool: readonly QuizEntry[], key: string): QuizEntry | undefined {
  const allowed = new Set<number>(QUIZ_DAILY_GENERATIONS);
  const candidates = pool.filter((p) => allowed.has(p.generation));
  return candidates[hashString(`quiz|${key}`) % candidates.length];
}

const searchable = (entry: QuizEntry) => normalizeText(formatName(entry.name));

/** The Pokémon a typed guess names ("mr mime", "Mr. Mime" and "mr-mime" all work), if any. */
export function matchGuess(pool: readonly QuizEntry[], text: string): QuizEntry | undefined {
  const query = normalizeText(text);
  if (!query) return undefined;
  return pool.find((p) => searchable(p) === query || normalizeText(p.name) === query);
}

/** Names that start with the text first, then names that contain it; guessed ones left out. */
export function suggestions(
  pool: readonly QuizEntry[],
  text: string,
  limit: number,
  exclude: readonly string[] = [],
): QuizEntry[] {
  const query = normalizeText(text);
  if (!query) return [];
  const skip = new Set(exclude);
  const open = pool.filter((p) => !skip.has(p.name));
  const starts = open.filter((p) => searchable(p).startsWith(query));
  const contains = open.filter(
    (p) => !searchable(p).startsWith(query) && searchable(p).includes(query),
  );
  return [...starts, ...contains].slice(0, limit);
}

export type GenerationClue = "same" | "higher" | "lower";

/** How a wrong guess compares to the answer: shared types, and where the answer's generation is. */
export function compareGuess(guess: QuizEntry, answer: QuizEntry) {
  const generation: GenerationClue =
    guess.generation === answer.generation
      ? "same"
      : answer.generation > guess.generation
        ? "higher"
        : "lower";
  return { sharedTypes: guess.types.filter((t) => answer.types.includes(t)), generation };
}

/** Hints unlocked after `misses` wrong guesses: types, then generation, then the first letter. */
export function hintsFor(answer: QuizEntry, misses: number) {
  const name = formatName(answer.name);
  return {
    types: misses >= 1 ? answer.types : undefined,
    generation: misses >= 2 ? answer.generation : undefined,
    firstLetter: misses >= 3 ? name.charAt(0) : undefined,
    length: misses >= 3 ? name.replace(/[^\p{L}\p{N}]/gu, "").length : undefined,
    /** The last hint: a lighter silhouette that shows some shapes inside. */
    clearer: misses >= 4,
  };
}

export type QuizStatus = "playing" | "solved" | "failed";

export function quizStatus(
  guesses: readonly string[],
  answer: QuizEntry,
  max = QUIZ_MAX_GUESSES,
): QuizStatus {
  if (guesses.includes(answer.name)) return "solved";
  return guesses.length >= max ? "failed" : "playing";
}

/** The Pokéball a daily result is worth: quick solves a Great Ball, any solve a Poké Ball. */
export function quizReward(guesses: number, solved: boolean): Ball | undefined {
  if (!solved) return undefined;
  return guesses <= QUIZ_GREAT_WITHIN ? "great" : "poke";
}

/** One square per guess: misses in red, the hit in green. Spoiler-free. */
export function quizGrid(guesses: readonly string[], answer: QuizEntry): string {
  return guesses.map((name) => (name === answer.name ? "🟩" : "🟥")).join("");
}

/** The same grid from a saved day (no answer needed). */
export function dayGrid(day: QuizDay): string {
  const misses = day.result === "solved" ? day.guesses.length - 1 : day.guesses.length;
  return "🟥".repeat(misses) + (day.result === "solved" ? "🟩" : "");
}

export function quizShareText(
  date: string,
  guesses: readonly string[],
  answer: QuizEntry,
  origin: string,
): string {
  const q = messages.quiz;
  const solved = guesses.includes(answer.name);
  const day = `${date.slice(8, 10)}/${date.slice(5, 7)}`;
  return [
    `${q.title} ${day} · ${solved ? `${guesses.length}/${QUIZ_MAX_GUESSES}` : `X/${QUIZ_MAX_GUESSES}`}`,
    quizGrid(guesses, answer),
    `${origin}/quiz`,
  ].join("\n");
}

// ---- The picture: served by our own route, so its URL doesn't give the number away ----

const TOKEN_FACTOR = 7919;
const TOKEN_OFFSET = 104_729;

/** 25 → an opaque base-36 token (not security, just not "25.png" in the page). */
export const encodeImageToken = (id: number) => (id * TOKEN_FACTOR + TOKEN_OFFSET).toString(36);

export function decodeImageToken(token: string): number | undefined {
  if (!/^[0-9a-z]{1,12}$/.test(token)) return undefined;
  const value = Number.parseInt(token, 36) - TOKEN_OFFSET;
  if (value <= 0 || value % TOKEN_FACTOR !== 0) return undefined;
  const id = value / TOKEN_FACTOR;
  return id >= 1 && id <= 1025 ? id : undefined;
}

// ---- Saved progress ----

export const quizDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Guessed species names, in order (the day's answer included when solved). */
  guesses: z.array(z.string().min(1).max(60)).max(QUIZ_MAX_GUESSES),
  /** Set once the day is over, so other screens can show it without knowing the answer. */
  result: z.enum(["solved", "failed"]).optional(),
});
export type QuizDay = z.infer<typeof quizDaySchema>;

export const quizProgressSchema = z.object({
  days: z.array(quizDaySchema).max(QUIZ_HISTORY),
  /** Best endless-mode streak. */
  best: z.number().int().min(0),
});
export type QuizProgress = z.infer<typeof quizProgressSchema>;

export const EMPTY_QUIZ: QuizProgress = { days: [], best: 0 };

/**
 * Adds a guess to the day (creating it) and closes the day when it is solved or out of guesses,
 * keeping the most recent days. A finished day or a repeated guess changes nothing.
 */
export function addGuess(
  progress: QuizProgress,
  date: string,
  name: string,
  answer: QuizEntry,
): QuizProgress {
  const day: QuizDay = progress.days.find((d) => d.date === date) ?? { date, guesses: [] };
  if (day.result || day.guesses.includes(name)) return progress;
  const guesses = [...day.guesses, name];
  const status = quizStatus(guesses, answer);
  const updated: QuizDay =
    status === "playing" ? { date, guesses } : { date, guesses, result: status };
  const days = [...progress.days.filter((d) => d.date !== date), updated]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-QUIZ_HISTORY);
  return { ...progress, days };
}
