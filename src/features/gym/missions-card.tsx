"use client";

import { Check, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { messages } from "@/config/messages";
import { MISSIONS, missionDone, weekKey, weeklyMissions } from "@/lib/missions";
import { BallIcon } from "./ball-icon";
import { claimMissionReward, sfx, useMissions } from "./use-gym";

const ms = messages.gym.missions;

/** Days until next Monday (the new missions), counting today. */
const daysToMonday = (date: Date) => 8 - (date.getDay() || 7);

/** This week's three missions: progress, and a button to claim each one finished. */
export function MissionsCard({ today }: { today: string }) {
  const date = new Date(`${today}T12:00:00`);
  const week = weekKey(date);
  const state = useMissions(week);
  return (
    <Card className="grid gap-3" data-testid="missions">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[0.65rem]">
          <Target aria-hidden className="size-4" />
          {ms.title}
        </h2>
        <span className="text-muted text-xs">{ms.hint(daysToMonday(date))}</span>
      </div>
      <ul className="grid gap-2">
        {weeklyMissions(week).map((id) => {
          const target = MISSIONS[id].target;
          const value = state.progress[id] ?? 0;
          const done = missionDone(state, id);
          const claimed = state.claimed.includes(id);
          return (
            <li key={id} className="grid gap-1" data-testid="mission">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  {claimed && <Check aria-hidden className="size-4 text-green-600" />}
                  {ms.items[id](target)}
                </span>
                {done && !claimed ? (
                  <Button
                    onClick={() => {
                      if (claimMissionReward(id)) sfx("pick");
                    }}
                  >
                    <BallIcon ball="great" className="size-5" />
                    {ms.claim}
                  </Button>
                ) : (
                  <span className="text-xs tabular-nums">
                    {claimed ? ms.claimed : `${value}/${target}`}
                  </span>
                )}
              </div>
              <div
                className="bg-border h-2 overflow-hidden rounded-full"
                role="meter"
                aria-label={ms.items[id](target)}
                aria-valuemin={0}
                aria-valuemax={target}
                aria-valuenow={value}
              >
                <div
                  className="h-full bg-linear-to-r from-amber-400 to-amber-600"
                  style={{ width: `${(value / target) * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-muted text-xs">{ms.reward}</p>
    </Card>
  );
}
