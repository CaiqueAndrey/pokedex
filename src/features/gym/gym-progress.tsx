"use client";

import { Lock, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { messages } from "@/config/messages";
import { ACHIEVEMENTS, BALLS } from "@/config/gym";
import { badgeCount, favoritePick, type GymStats } from "@/lib/battle/progress";
import { formatName } from "@/lib/format";
import { BallIcon } from "./ball-icon";

const m = messages.gym;

export function GymProgress({ stats, achievements }: { stats: GymStats; achievements: string[] }) {
  const favorite = favoritePick(stats);
  const rows: [string, string | number][] = [
    [m.stats.runs, stats.runs],
    [m.stats.badges, badgeCount(stats)],
    [m.stats.rocket, stats.cleared.daily],
    [m.stats.battlesWon, stats.battlesWon],
    [m.stats.best, m.bestOf(stats.best)],
    [m.stats.streak, stats.streak],
    [m.stats.bestStreak, stats.bestStreak],
  ];
  // Only ids that still exist count (achievements may be renamed between versions).
  const known = new Set<string>(ACHIEVEMENTS);
  const unlocked = new Set(achievements.filter((id) => known.has(id)));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="grid content-start gap-3" data-testid="gym-stats">
        <h2 className="text-[0.65rem]">{m.statsTitle}</h2>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {rows.map(([label, value]) => (
            <div key={label} className="border-border rounded-xl border-2 p-2">
              <dt className="text-muted text-xs">{label}</dt>
              <dd className="font-display text-xs">{value}</dd>
            </div>
          ))}
        </dl>
        {favorite && (
          <p className="text-sm">
            {m.stats.favorite}: <strong>{formatName(favorite)}</strong>
          </p>
        )}
        <h3 className="mt-2 text-[0.6rem]">{m.ballsTitle}</h3>
        <ul className="grid grid-cols-4 gap-2" data-testid="balls">
          {BALLS.map((ball) => (
            <li
              key={ball}
              className="border-border flex flex-col items-center gap-1 rounded-xl border-2 p-2 text-center"
            >
              <BallIcon ball={ball} earned={stats.balls[ball] > 0} className="size-10" />
              <span className="text-xs">{m.balls[ball]}</span>
              <span className="font-display text-xs">{stats.balls[ball]}</span>
            </li>
          ))}
        </ul>
        <p className="text-muted text-xs">{m.ballsHint}</p>
      </Card>
      <Card className="grid content-start gap-3" data-testid="achievements">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[0.65rem]">{m.achievementsTitle}</h2>
          <span className="text-muted text-sm">
            {m.achievementCount(unlocked.size, ACHIEVEMENTS.length)}
          </span>
        </div>
        <ul className="grid gap-2">
          {ACHIEVEMENTS.map((id) => {
            const done = unlocked.has(id);
            const Icon = done ? Trophy : Lock;
            return (
              <li
                key={id}
                className={cn("flex items-start gap-2 text-sm", !done && "text-muted")}
                data-testid={done ? "achievement-unlocked" : "achievement-locked"}
              >
                <Icon
                  aria-hidden
                  className={cn("mt-0.5 size-4 shrink-0", done && "text-amber-500")}
                />
                <span>
                  <strong>{m.achievements[id].label}</strong>
                  <span className="sr-only">{done ? "" : ` (${m.achievementLocked})`}</span>:{" "}
                  {m.achievements[id].description}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
