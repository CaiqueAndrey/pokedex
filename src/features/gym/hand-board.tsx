"use client";

import { Check, Swords } from "lucide-react";
import { useState } from "react";
import { ActionBar } from "@/components/ui/action-bar";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { GYMS, TEAM_SIZE } from "@/config/gym";
import { messages } from "@/config/messages";
import { teamBst } from "@/lib/battle/team";
import { formatName } from "@/lib/format";
import type { BattlePokemon } from "@/types/battle";
import { GymPokemon } from "./gym-pokemon";
import { Tip } from "./tip";
import { sfx } from "./use-gym";

const m = messages.gym;
const g = m.gauntlet;

/**
 * The gauntlet's draft: the day's hand of 12 (the same for everyone), pick 6 under the cap in one
 * screen. Offers that would break the cap are disabled; the counter and the bar show what's left.
 */
export function HandBoard({
  hand,
  onConfirm,
}: {
  hand: BattlePokemon[];
  onConfirm: (names: string[]) => void;
}) {
  const [chosen, setChosen] = useState<string[]>([]);
  const cap = GYMS.daily.rules.player ?? Number.POSITIVE_INFINITY;
  const team = hand.filter((p) => chosen.includes(p.name));
  const used = teamBst(team);
  const full = chosen.length >= TEAM_SIZE;
  const ratio = Number.isFinite(cap) ? Math.min(1, used / cap) : 0;

  function toggle(pokemon: BattlePokemon) {
    sfx("click");
    setChosen((current) =>
      current.includes(pokemon.name)
        ? current.filter((name) => name !== pokemon.name)
        : [...current, pokemon.name],
    );
  }

  return (
    <section aria-labelledby="hand-title" className="grid gap-4" data-testid="hand-board">
      <div className="grid gap-1">
        <h2 id="hand-title" className="text-xs sm:text-sm">
          {g.handTitle}
        </h2>
        <p className="text-muted text-base">{g.handHint}</p>
      </div>

      <Tip id="hand" />

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {hand.map((pokemon, index) => {
          const selected = chosen.includes(pokemon.name);
          const fits = selected || (!full && used + pokemon.bst <= cap);
          return (
            <li
              key={pokemon.name}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <button
                type="button"
                aria-pressed={selected}
                disabled={!fits}
                onClick={() => toggle(pokemon)}
                aria-label={
                  selected
                    ? g.unselect(formatName(pokemon.name))
                    : g.select(formatName(pokemon.name))
                }
                className={cn(
                  "relative block h-full w-full rounded-2xl text-left transition-all",
                  selected && "ring-primary-600 ring-4",
                  !fits && "opacity-50 grayscale",
                )}
              >
                <GymPokemon pokemon={pokemon} showStats className="h-full">
                  {selected ? (
                    <span className="bg-primary-600 text-on-primary mt-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold">
                      <Check aria-hidden className="size-3" />
                      {chosen.indexOf(pokemon.name) + 1}
                    </span>
                  ) : (
                    !fits && !full && <span className="mt-2 text-xs font-bold">{g.noFit}</span>
                  )}
                </GymPokemon>
              </button>
            </li>
          );
        })}
      </ul>
      <ActionBar
        hint={
          <div className="grid gap-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-display text-[0.6rem]" data-testid="hand-count">
                {g.selected(chosen.length)}
              </span>
              <span className="text-sm tabular-nums" data-testid="budget">
                {m.budget(used, cap)}
              </span>
            </div>
            <div className="bg-border h-2 overflow-hidden rounded-full" aria-hidden>
              <div
                className="from-primary-600 h-full bg-linear-to-r to-amber-500 transition-all duration-300"
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
          </div>
        }
      >
        <Button
          disabled={!full}
          onClick={() => onConfirm(team.map((p) => p.name))}
          className={cn(full && "motion-safe:animate-pulse")}
        >
          <Swords aria-hidden className="size-4" />
          {g.confirm}
        </Button>
      </ActionBar>
    </section>
  );
}
