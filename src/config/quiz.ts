/** "Quem é esse Pokémon?" rules (project-goal.md §8.10, Phase 13). Tune here, not in the logic. */

/** Guesses for the daily Pokémon: each miss unlocks the next hint. */
export const QUIZ_MAX_GUESSES = 5;
/** Generations the daily answer is drawn from: the most recognizable ones. Guesses accept any. */
export const QUIZ_DAILY_GENERATIONS = [1, 2, 3, 4, 5] as const;
/** Guesses per Pokémon in endless mode (a miss on the last one ends the streak). */
export const QUIZ_ENDLESS_GUESSES = 3;
/** Daily results kept (also the archive's reach). */
export const QUIZ_HISTORY = 30;
/** Suggestions shown under the guess field. */
export const QUIZ_SUGGESTIONS = 6;
/** XP for solving the daily Pokémon. */
export const QUIZ_XP = 20;
/** Solving the daily within this many guesses earns a Great Ball; any later solve a Poké Ball. */
export const QUIZ_GREAT_WITHIN = 2;
