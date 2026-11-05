"use client";

import { CircleHelp } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { messages } from "@/config/messages";
import { dayGrid } from "@/lib/quiz";
import { useQuizProgress } from "./use-quiz";

const c = messages.quiz.hubCard;

/** The other daily game, on the gym's hub: today's status and a link (it counts for the streak). */
export function QuizHubCard({ today }: { today: string }) {
  const { days } = useQuizProgress();
  const day = days.find((d) => d.date === today);
  return (
    <Card className="flex flex-wrap items-center gap-3" data-testid="quiz-hub-card">
      <span
        aria-hidden
        className="font-display grid size-10 shrink-0 place-items-center rounded-xl bg-sky-600 text-lg text-white"
      >
        ?
      </span>
      <div className="grid min-w-48 flex-1 gap-1">
        <p className="font-display text-[0.6rem] leading-relaxed">{c.title}</p>
        <p className="text-muted text-sm">{day?.result ? c.played(dayGrid(day)) : c.notPlayed}</p>
      </div>
      <LinkButton href="/quiz" variant={day?.result ? "secondary" : "primary"}>
        <CircleHelp aria-hidden className="size-4" />
        {day?.result ? c.ctaPlayed : c.cta}
      </LinkButton>
    </Card>
  );
}
