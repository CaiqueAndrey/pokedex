"use client";

import { BookOpen, Infinity as InfinityIcon, Trophy } from "lucide-react";
import { useState } from "react";
import { ActionBar } from "@/components/ui/action-bar";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type AchievementId } from "@/config/gym";
import { messages } from "@/config/messages";
import { QUIZ_MAX_GUESSES, QUIZ_XP } from "@/config/quiz";
import { formatCountdown, formatName } from "@/lib/format";
import {
  dailyAnswer,
  hintsFor,
  quizReward,
  quizShareText,
  quizStatus,
  type QuizEntry,
} from "@/lib/quiz";
import { BallIcon } from "../gym/ball-icon";
import { ShareButton } from "../gym/share-button";
import { recordQuizDay, sfx, useToday } from "../gym/use-gym";
import { markDex } from "../pokedex/use-dex-progress";
import { GuessList, Hints } from "./clues";
import { GuessForm } from "./guess-form";
import { Silhouette } from "./silhouette";
import { saveGuess, useQuizProgress } from "./use-quiz";

const q = messages.quiz;
const g = messages.gym;

interface Outcome {
  unlocked: AchievementId[];
  streakBonus?: number;
}

/** Today's Pokémon: the same for everyone, five guesses, a hint after each miss. */
export function DailyQuiz({
  pool,
  onEndless,
}: {
  pool: readonly QuizEntry[];
  onEndless: () => void;
}) {
  const { today, secondsLeft } = useToday();
  const progress = useQuizProgress();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const answer = today ? dailyAnswer(pool, today) : undefined;

  // The date is local (the player's midnight), so nothing renders until the client knows it.
  if (!today || !answer) {
    return (
      <div className="grid gap-4" aria-busy>
        <Skeleton className="mx-auto aspect-square w-full max-w-64" />
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }

  const day = progress.days.find((d) => d.date === today);
  const guesses = day?.guesses ?? [];
  const status = quizStatus(guesses, answer);
  const misses = guesses.filter((name) => name !== answer.name).length;
  const done = status !== "playing";
  const reward = quizReward(guesses.length, status === "solved");
  const name = formatName(answer.name);

  function guess(entry: QuizEntry) {
    if (!answer || !today) return;
    const saved = saveGuess(today, entry.name, answer);
    sfx(entry.name === answer.name ? "reveal" : "wrong");
    if (!saved?.result) return;
    markDex({ seen: [answer.id] });
    const solved = saved.result === "solved";
    setOutcome(
      recordQuizDay(
        today,
        quizReward(saved.guesses.length, solved),
        solved && saved.guesses.length === 1,
      ),
    );
  }

  return (
    <div className="grid gap-5" data-testid="daily-quiz">
      <div className="grid gap-5 md:grid-cols-[20rem_1fr] md:items-start">
        <div className="grid gap-2">
          <Silhouette
            id={answer.id}
            revealed={done}
            clearer={hintsFor(answer, misses).clearer}
            name={name}
          />
          <p className="text-center text-sm" data-testid="attempt">
            {done
              ? status === "solved"
                ? q.solvedIn(guesses.length)
                : q.failed(name)
              : q.attempt(guesses.length + 1, QUIZ_MAX_GUESSES)}
          </p>
        </div>

        <div className="grid content-start gap-4">
          {done ? (
            <Card className="grid gap-3" data-testid="quiz-result">
              <h2 className="text-xs leading-relaxed sm:text-sm">
                {status === "solved" ? q.revealed(name) : q.failed(name)}
              </h2>
              {reward && (
                <p className="font-display flex items-center gap-2 text-[0.6rem] leading-relaxed">
                  <BallIcon ball={reward} className="size-8" />
                  {g.ballWon(g.balls[reward])} · {q.rewardXp(QUIZ_XP)}
                </p>
              )}
              {outcome?.streakBonus && (
                <p className="font-display flex items-center gap-2 text-[0.6rem] leading-relaxed">
                  <BallIcon ball="master" className="size-8" />
                  {g.streakBonus(outcome.streakBonus)}
                </p>
              )}
              {outcome?.unlocked.map((id) => (
                <p key={id} className="flex items-center gap-2 text-sm">
                  <Trophy aria-hidden className="size-4 text-amber-500" />
                  <strong>{g.achievements[id].label}</strong>: {g.achievements[id].description}
                </p>
              ))}
              <p className="font-bold tabular-nums">{q.nextDaily(formatCountdown(secondsLeft))}</p>
              <LinkButton href={`/pokemon/${answer.name}`} variant="ghost" className="w-fit">
                <BookOpen aria-hidden className="size-4" />
                {q.seeDetails(name)}
              </LinkButton>
            </Card>
          ) : (
            <GuessForm pool={pool} guessed={guesses} onGuess={guess} />
          )}
          <Hints
            answer={answer}
            misses={done ? QUIZ_MAX_GUESSES : misses}
            total={QUIZ_MAX_GUESSES}
          />
          <GuessList guesses={guesses} pool={pool} answer={answer} />
          <p className="text-muted text-sm">{q.rules}</p>
        </div>
      </div>

      {done && (
        <ActionBar>
          <ShareButton
            title={q.shareTitle}
            text={(origin) => quizShareText(today, guesses, answer, origin)}
          />
          <Button onClick={onEndless}>
            <InfinityIcon aria-hidden className="size-4" />
            {q.playEndless}
          </Button>
        </ActionBar>
      )}
    </div>
  );
}
