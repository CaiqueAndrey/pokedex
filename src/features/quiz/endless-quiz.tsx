"use client";

import { ArrowRight, Play, RotateCcw } from "lucide-react";
import { useState } from "react";
import { ActionBar } from "@/components/ui/action-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LAST_SPECIES_ID_BY_GENERATION } from "@/config/gym";
import { generationLabel, messages } from "@/config/messages";
import { QUIZ_ENDLESS_GUESSES } from "@/config/quiz";
import { formatName } from "@/lib/format";
import { quizStatus, type QuizEntry } from "@/lib/quiz";
import { recordMission, sfx } from "../gym/use-gym";
import { markDex } from "../pokedex/use-dex-progress";
import { GuessList, Hints } from "./clues";
import { GuessForm } from "./guess-form";
import { Silhouette } from "./silhouette";
import { saveBest, useQuizProgress } from "./use-quiz";

const q = messages.quiz;
const e = q.endless;

interface Round {
  answer: QuizEntry;
  guesses: string[];
}

/** A random Pokémon not seen yet in this streak (any, once every one was seen). */
function draw(candidates: readonly QuizEntry[], seen: ReadonlySet<string>): QuizEntry {
  const fresh = candidates.filter((entry) => !seen.has(entry.name));
  const from = fresh.length > 0 ? fresh : candidates;
  return from[Math.floor(Math.random() * from.length)] as QuizEntry;
}

/**
 * Endless mode: three guesses per Pokémon, as many in a row as you can. Practice only: no rewards,
 * just the best streak. Random draws happen on click, so the server render stays deterministic.
 */
export function EndlessQuiz({ pool }: { pool: readonly QuizEntry[] }) {
  const { best } = useQuizProgress();
  const [generation, setGeneration] = useState(0);
  const [round, setRound] = useState<Round | null>(null);
  const [streak, setStreak] = useState(0);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const candidates = generation === 0 ? pool : pool.filter((p) => p.generation === generation);

  function next(fromStreak: number, history: Set<string>) {
    const answer = draw(candidates, history);
    setSeen(new Set([...history, answer.name]));
    setStreak(fromStreak);
    setRound({ answer, guesses: [] });
  }

  if (!round) {
    return (
      <Card className="grid gap-4" data-testid="endless-intro">
        <p className="text-base">{e.intro}</p>
        <p className="font-display text-[0.6rem]">{e.best(best)}</p>
        <label className="grid gap-1 text-sm">
          <span className="font-display text-[0.6rem]">{e.generation}</span>
          <select
            value={generation}
            onChange={(event) => setGeneration(Number(event.target.value))}
            className="border-border bg-surface min-h-11 rounded-xl border-2 px-3 text-base"
          >
            <option value={0}>{e.all}</option>
            {LAST_SPECIES_ID_BY_GENERATION.map((_, index) => (
              <option key={index} value={index + 1}>
                {generationLabel(index + 1)}
              </option>
            ))}
          </select>
        </label>
        <ActionBar>
          <Button onClick={() => next(0, new Set())}>
            <Play aria-hidden className="size-4" />
            {e.next}
          </Button>
        </ActionBar>
      </Card>
    );
  }

  const { answer, guesses } = round;
  const status = quizStatus(guesses, answer, QUIZ_ENDLESS_GUESSES);
  const misses = guesses.filter((name) => name !== answer.name).length;
  const done = status !== "playing";
  const name = formatName(answer.name);
  const newBest = status === "failed" && streak > 0 && streak >= best;

  function guess(entry: QuizEntry) {
    const updated = [...guesses, entry.name];
    const after = quizStatus(updated, answer, QUIZ_ENDLESS_GUESSES);
    sfx(entry.name === answer.name ? "reveal" : "wrong");
    setRound({ answer, guesses: updated });
    if (after !== "playing") markDex({ seen: [answer.id] });
    if (after === "solved") {
      setStreak(streak + 1);
      saveBest(streak + 1);
      recordMission("endless", streak + 1, "max");
    }
  }

  return (
    <div className="grid gap-5" data-testid="endless-quiz">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-[0.65rem]" data-testid="endless-streak">
          {e.streak(streak)}
        </p>
        <p className="text-muted text-sm">{e.best(Math.max(best, streak))}</p>
      </div>
      <div className="grid gap-5 md:grid-cols-[20rem_1fr] md:items-start">
        <Silhouette id={answer.id} revealed={done} name={name} />
        <div className="grid content-start gap-4">
          {done ? (
            <Card className="grid gap-2" data-testid="endless-result">
              <h2 className="text-xs leading-relaxed sm:text-sm">
                {status === "solved" ? q.revealed(name) : q.failed(name)}
              </h2>
              {status === "failed" && <p className="text-base">{e.over(streak)}</p>}
              {newBest && <p className="font-display text-[0.6rem]">{e.newBest}</p>}
            </Card>
          ) : (
            <GuessForm pool={pool} guessed={guesses} onGuess={guess} />
          )}
          <Hints
            answer={answer}
            misses={done ? QUIZ_ENDLESS_GUESSES : misses}
            total={QUIZ_ENDLESS_GUESSES}
          />
          <GuessList guesses={guesses} pool={pool} answer={answer} />
        </div>
      </div>
      {done && (
        <ActionBar>
          {status === "solved" ? (
            <Button onClick={() => next(streak, seen)} autoFocus>
              {e.next}
              <ArrowRight aria-hidden className="size-4" />
            </Button>
          ) : (
            <Button onClick={() => next(0, new Set())} autoFocus>
              <RotateCcw aria-hidden className="size-4" />
              {e.restart}
            </Button>
          )}
        </ActionBar>
      )}
    </div>
  );
}
