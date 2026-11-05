"use client";

import { useSyncExternalStore } from "react";
import { EMPTY_QUIZ, addGuess, quizProgressSchema, type QuizEntry } from "@/lib/quiz";
import { STORAGE_KEYS } from "@/lib/storage";
import { createValueStore } from "@/lib/value-store";

const quizStore = createValueStore(STORAGE_KEYS.quiz, quizProgressSchema, EMPTY_QUIZ);

/** The quiz's saved progress: each day's guesses and the endless-mode record. */
export function useQuizProgress() {
  return useSyncExternalStore(
    quizStore.subscribe,
    quizStore.getSnapshot,
    quizStore.getServerSnapshot,
  );
}

/** Saves a guess for `date` (read from the store, never from a stale render) and returns the day. */
export function saveGuess(date: string, name: string, answer: QuizEntry) {
  const next = addGuess(quizStore.getSnapshot(), date, name, answer);
  quizStore.set(next);
  return next.days.find((day) => day.date === date);
}

/** Keeps the best endless streak. */
export function saveBest(streak: number) {
  const current = quizStore.getSnapshot();
  if (streak > current.best) quizStore.set({ ...current, best: streak });
}

export function resetQuiz() {
  quizStore.set(EMPTY_QUIZ);
}
