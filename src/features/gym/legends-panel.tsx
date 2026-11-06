"use client";

import { Check, Sparkles } from "lucide-react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { ModalButton } from "@/components/ui/modal-button";
import { LEGENDARY_SETS, type LegendarySet } from "@/config/gym";
import { messages } from "@/config/messages";
import { playsToStreakBonus, type GymStats } from "@/lib/battle/progress";
import { formatName } from "@/lib/format";
import { spriteUrl } from "@/lib/sprites";
import type { BattlePokemon } from "@/types/battle";
import { BallIcon } from "./ball-icon";

const m = messages.gym;
const l = m.legends;
const SETS = Object.keys(LEGENDARY_SETS) as LegendarySet[];

/** No legendary, a Master Ball encounter, or a caught legendary called by name. */
export type LegendChoice = "none" | "encounter" | (string & {});

/** The groups and how far along each is (for the dialog and the rewards tab). */
export function LegendSets({
  caught,
  done,
}: {
  caught: readonly string[];
  done: readonly string[];
}) {
  return (
    <ul className="grid gap-1 text-sm" data-testid="legend-sets">
      {SETS.map((set) => {
        const members = LEGENDARY_SETS[set];
        const have = members.filter((name) => caught.includes(name)).length;
        const complete = done.includes(set);
        return (
          <li key={set} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1">
              {complete && <Check aria-hidden className="size-4 text-green-600" />}
              {l.setNames[set]}
            </span>
            <span className="tabular-nums">{l.setProgress(have, members.length)}</span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The legendary loop on the hub: what you have, what to bring to the next challenge (a new
 * encounter for a Master Ball, or one you already caught) and, in a dialog, how it all works.
 */
export function LegendsPanel({
  stats,
  pool,
  days,
  today,
  playedToday,
  choice,
  onChoose,
}: {
  stats: GymStats;
  pool: BattlePokemon[];
  days: { date: string }[];
  today: string;
  playedToday: boolean;
  choice: LegendChoice;
  onChoose: (choice: LegendChoice) => void;
}) {
  const legendaries = pool.filter((p) => p.legendary);
  const caught = legendaries.filter((p) => stats.caught.includes(p.name));
  const balls = stats.balls.master;
  const canChoose = balls > 0 || caught.length > 0;

  return (
    <Card className="grid gap-3" data-testid="legendary-option">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display flex items-center gap-2 text-[0.65rem]">
          <Sparkles aria-hidden className="size-4 text-amber-500" />
          {l.title}
        </h2>
        <ModalButton label={l.how} title={l.howTitle} testId="legends-how">
          <ol className="grid list-decimal gap-2 pl-5">
            {l.loop.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <h3 className="text-[0.6rem]">{l.pathsTitle}</h3>
          <ul className="grid gap-1 text-sm" data-testid="legendary-paths">
            <li className="flex items-start gap-2">
              <BallIcon ball="master" earned={false} className="size-5 shrink-0" />
              <span>{m.hub.legendaryPaths.hard(stats.cleared.hard)}</span>
            </li>
            {today && (
              <li className="flex items-start gap-2">
                <BallIcon ball="master" earned={false} className="size-5 shrink-0" />
                <span>
                  {m.hub.legendaryPaths.streak(playsToStreakBonus(days, today), playedToday)}
                </span>
              </li>
            )}
          </ul>
          <h3 className="text-[0.6rem]">{l.setsTitle}</h3>
          <LegendSets caught={stats.caught} done={stats.legendSets} />
        </ModalButton>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="flex items-center gap-1">
          <BallIcon ball="master" earned={balls > 0} className="size-6" />
          {m.ballCount(m.balls.master, balls)}
        </span>
        <span>{l.caught(caught.length, legendaries.length)}</span>
        <span>{l.sets(stats.legendSets.length, SETS.length)}</span>
      </div>

      {caught.length > 0 && (
        <ul className="flex flex-wrap" aria-label={m.hub.legendsTitle}>
          {caught.map((pokemon) => (
            <li key={pokemon.name} title={formatName(pokemon.name)}>
              <Image
                src={spriteUrl(pokemon.id, "default")}
                alt={formatName(pokemon.name)}
                width={40}
                height={40}
                unoptimized
                className="size-10"
              />
            </li>
          ))}
        </ul>
      )}

      {canChoose ? (
        <label className="grid gap-1 text-sm">
          <span className="font-display text-[0.6rem]">{l.choiceLabel}</span>
          <select
            value={choice}
            onChange={(event) => onChoose(event.target.value)}
            className="border-border bg-background min-h-11 rounded-xl border-2 px-3 text-base"
            data-testid="legend-choice"
          >
            <option value="none">{l.none}</option>
            {balls > 0 && <option value="encounter">{l.encounter(balls)}</option>}
            {caught.map((pokemon) => (
              <option key={pokemon.name} value={pokemon.name}>
                {l.summon(formatName(pokemon.name))}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="text-muted text-sm">{m.hub.legendaryLocked}</p>
      )}
    </Card>
  );
}
