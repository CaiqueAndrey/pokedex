"use client";

import { CalendarDays, Infinity as InfinityIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/components/ui/cn";
import { messages } from "@/config/messages";
import type { QuizEntry } from "@/lib/quiz";
import { DailyQuiz } from "./daily-quiz";
import { EndlessQuiz } from "./endless-quiz";

const q = messages.quiz;

type Mode = "daily" | "endless";

/** "Quem é esse Pokémon?": today's Pokémon or the endless practice, one tab each. */
export function QuizGame({ pool }: { pool: QuizEntry[] }) {
  const [mode, setMode] = useState<Mode>("daily");
  const tabs = [
    { id: "daily", label: q.modes.daily, Icon: CalendarDays },
    { id: "endless", label: q.modes.endless, Icon: InfinityIcon },
  ] as const;

  return (
    <div className="grid gap-5">
      <header className="grid gap-2">
        <h1 className="text-base sm:text-lg">{q.title}</h1>
        <p className="text-muted text-base">{q.description}</p>
      </header>
      <div role="group" aria-label={q.modesLabel} className="grid grid-cols-2 gap-1 sm:w-fit">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => setMode(id)}
            className={cn(
              "font-display flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 px-4 text-[0.6rem]",
              mode === id
                ? "border-foreground bg-primary-600 text-on-primary shadow-[0_3px_0_0_var(--foreground)]"
                : "border-border bg-surface hover:bg-border/60",
            )}
          >
            <Icon aria-hidden className="size-4" />
            {label}
          </button>
        ))}
      </div>
      {mode === "daily" ? (
        <DailyQuiz pool={pool} onEndless={() => setMode("endless")} />
      ) : (
        <EndlessQuiz pool={pool} />
      )}
    </div>
  );
}
