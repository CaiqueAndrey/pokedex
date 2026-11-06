"use client";

import { Check, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModalButton } from "@/components/ui/modal-button";
import { messages } from "@/config/messages";
import { MISSIONS, missionDone, weekKey, weeklyMissions, type MissionState } from "@/lib/missions";
import { BallIcon } from "./ball-icon";
import { claimMissionReward, sfx, useMissions } from "./use-gym";

const ms = messages.gym.missions;

/** Days until next Monday (the new missions), counting today. */
const daysToMonday = (date: Date) => 8 - (date.getDay() || 7);

function MissionList({ week, state }: { week: string; state: MissionState }) {
  return (
    <ul className="grid gap-3">
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
  );
}

/**
 * This week's three missions. `compact` (the hub) shows one line and a button to the list;
 * the Rewards tab shows the list itself.
 */
export function MissionsCard({ today, compact = false }: { today: string; compact?: boolean }) {
  const date = new Date(`${today}T12:00:00`);
  const week = weekKey(date);
  const state = useMissions(week);
  const ids = weeklyMissions(week);
  const done = ids.filter((id) => missionDone(state, id)).length;
  const ready = ids.some((id) => missionDone(state, id) && !state.claimed.includes(id));
  const title = (
    <span className="flex items-center gap-2">
      <Target aria-hidden className="size-4" />
      {ms.title}
    </span>
  );

  if (compact) {
    return (
      <Card className="flex flex-wrap items-center gap-3" data-testid="missions">
        <div className="grid min-w-40 flex-1 gap-0.5">
          <h2 className="text-[0.65rem]">{title}</h2>
          <p className="text-sm">
            {ms.summary(done, ids.length)}
            {ready && (
              <strong className="ml-2 text-amber-600 dark:text-amber-400">{ms.ready}</strong>
            )}
          </p>
        </div>
        <ModalButton label={ms.open} title={ms.title} variant="secondary" testId="missions-open">
          <MissionList week={week} state={state} />
          <p className="text-muted text-xs">
            {ms.reward} · {ms.hint(daysToMonday(date))}
          </p>
        </ModalButton>
      </Card>
    );
  }

  return (
    <Card className="grid gap-3" data-testid="missions">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[0.65rem]">{title}</h2>
        <span className="text-muted text-xs">{ms.hint(daysToMonday(date))}</span>
      </div>
      <MissionList week={week} state={state} />
      <p className="text-muted text-xs">{ms.reward}</p>
    </Card>
  );
}
