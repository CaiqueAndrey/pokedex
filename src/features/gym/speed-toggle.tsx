"use client";

import { cn } from "@/components/ui/cn";
import { messages } from "@/config/messages";
import type { BattleSpeed } from "@/config/gym";
import { useBattleSpeed } from "./use-gym";

const SPEEDS: BattleSpeed[] = ["slow", "medium", "fast"];

export function SpeedToggle() {
  const { speed, setSpeed } = useBattleSpeed();
  return (
    <div role="group" aria-label={messages.gym.speedLabel} className="flex items-center gap-2">
      <span className="text-muted text-sm">{messages.gym.speedLabel}</span>
      <div className="flex">
        {SPEEDS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={speed === value}
            onClick={() => setSpeed(value)}
            className={cn(
              "font-display min-h-11 border-2 px-3 text-[0.55rem] first:rounded-l-xl last:rounded-r-xl",
              speed === value
                ? "border-foreground bg-primary-600 text-on-primary"
                : "border-border bg-surface hover:bg-border/60",
            )}
          >
            {messages.gym.speeds[value]}
          </button>
        ))}
      </div>
    </div>
  );
}
