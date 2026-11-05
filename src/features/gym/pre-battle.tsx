"use client";

import { ArrowDown, ArrowUp, GripVertical, Swords } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { messages } from "@/config/messages";
import { matchupScore } from "@/lib/battle/damage";
import { battleConfig, gymOf, type GymMode } from "@/lib/battle/run";
import { teamBst } from "@/lib/battle/team";
import { formatName } from "@/lib/format";
import type { BattlePokemon } from "@/types/battle";
import type { TypeRelations } from "@/types/pokemon";
import { GymPokemon, HiddenPokemon, MiniStats } from "./gym-pokemon";

const m = messages.gym;

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  if (item === undefined) return copy;
  copy.splice(to, 0, item);
  return copy;
}

type Fit = "good" | "bad" | "even";

const FIT_LABEL: Record<Fit, string> = {
  good: `▲ ${m.matchupGood}`,
  bad: `▼ ${m.matchupBad}`,
  even: m.matchupEven,
};

function MatchupTag({ fit, against }: { fit: Fit | null; against: BattlePokemon }) {
  if (!fit) return null;
  const label = m.matchupAgainst(formatName(against.name));
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 text-xs font-bold",
        fit === "good" && "bg-green-600 text-white",
        fit === "bad" && "bg-primary-600 text-on-primary",
        fit === "even" && "bg-border",
      )}
      title={label}
      data-testid={`matchup-${fit}`}
    >
      {FIT_LABEL[fit]}
      <span className="sr-only"> · {label}</span>
    </span>
  );
}

export function PreBattle({
  battle,
  mode,
  trainer,
  team,
  opponent,
  relations,
  counters,
  health,
  defeated,
  onReorder,
  onFight,
}: {
  battle: number;
  mode: GymMode;
  trainer: string;
  team: BattlePokemon[];
  opponent: BattlePokemon[];
  relations: TypeRelations;
  /** The trainer picks its lead after seeing yours (its order follows your first slot). */
  counters: boolean;
  /** Gauntlet: current and max HP per team member (in team order). */
  health?: { hp: number; max: number }[];
  /** Gauntlet: trainers beaten so far. */
  defeated?: number;
  onReorder: (order: string[]) => void;
  onFight: () => void;
}) {
  const gym = gymOf({ mode });
  const config = battleConfig({ mode }, battle);
  const reveal = gym.rules.reveal;
  const [selected, setSelected] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const names = team.map((p) => p.name);
  const opponentLead = opponent[0];
  // Easy mode coaching: how each of yours fares against the opponent's lead.
  const matchup = (pokemon: BattlePokemon): Fit | null => {
    if (!reveal || !opponentLead) return null;
    const score = matchupScore(pokemon, opponentLead, relations);
    return score > 0 ? "good" : score < 0 ? "bad" : "even";
  };

  const move = (from: number, to: number) => {
    if (from === to) return;
    onReorder(moveItem(names, from, to));
  };

  // Tap one, then another: they swap places (works on touch screens and with the keyboard).
  const select = (index: number) => {
    if (selected === null) return setSelected(index);
    if (selected !== index) {
      const order = [...names];
      [order[selected], order[index]] = [order[index] as string, order[selected] as string];
      onReorder(order);
    }
    setSelected(null);
  };

  return (
    <div className="grid gap-6">
      <div className="animate-fade-up flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {config?.image && (
            <div className="animate-fade-up relative h-32 w-24 shrink-0 drop-shadow-[0_8px_10px_rgba(0,0,0,0.3)]">
              <Image
                src={config.image}
                alt={trainer}
                fill
                sizes="96px"
                className="object-contain object-bottom"
              />
            </div>
          )}
          <div>
            <p className="text-muted text-sm">
              {gym.name} · {m.battleOf(battle + 1, gym.battles.length)}
            </p>
            <h2 className="text-xs sm:text-sm" data-testid="trainer">
              {m.versus(trainer)}
            </h2>
            {config?.leader && (
              <p className="text-sm font-bold">⭐ {mode === "daily" ? m.boss : m.leader}</p>
            )}
          </div>
        </div>
        <Button onClick={onFight} className="motion-safe:animate-pulse">
          <Swords aria-hidden className="size-4" />
          {m.fight}
        </Button>
      </div>

      <section aria-labelledby="opponent-title" className="grid gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="opponent-title" className="text-[0.65rem]">
            {m.opponentTeam}
          </h3>
          {reveal && (
            <span className="text-sm" data-testid="opponent-power">
              {m.opponentPower(teamBst(opponent))}
            </span>
          )}
        </div>
        <p className="text-sm" data-testid="scout-hint">
          {m.scoutHint(trainer)}
        </p>
        {reveal ? (
          <>
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {opponent.map((pokemon, i) => (
                <li
                  key={pokemon.name}
                  className="animate-fade-up relative"
                  style={{ animationDelay: `${i * 60}ms` }}
                  data-testid="opponent-pokemon"
                >
                  <span className="font-display bg-foreground text-background absolute top-1 left-1 z-10 rounded-md px-1.5 py-0.5 text-[0.55rem]">
                    {i + 1}
                  </span>
                  <GymPokemon pokemon={pokemon} compact showTypes>
                    {i === 0 && (
                      <span className="text-primary-600 mt-1 text-xs font-bold">
                        {m.opponentLead}
                      </span>
                    )}
                  </GymPokemon>
                </li>
              ))}
            </ol>
            <p className="text-muted text-sm">{m.opponentHint}</p>
            {counters && (
              <p className="text-sm font-bold" data-testid="counter-hint">
                {m.counterHint(trainer)}
              </p>
            )}
          </>
        ) : (
          <>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {Array.from({ length: opponent.length }, (_, i) => (
                <li key={i}>
                  <HiddenPokemon index={i} />
                </li>
              ))}
            </ul>
            <p className="text-sm">{m.hiddenTeam}</p>
          </>
        )}
      </section>

      <section aria-labelledby="order-title">
        <h3 id="order-title" className="mb-1 text-[0.65rem]">
          {m.yourTeam}
        </h3>
        <p className="text-muted mb-2 text-sm">{m.orderHintDrag}</p>
        {health && (
          <p className="mb-2 text-sm font-bold" data-testid="gauntlet-status">
            {m.gauntlet.defeated(defeated ?? 0)} · {m.gauntlet.hpCarry}
          </p>
        )}
        <p className="sr-only" aria-live="polite">
          {selected !== null && team[selected] ? m.selected(formatName(team[selected].name)) : ""}
        </p>
        <ol className="grid gap-2">
          {team.map((pokemon, i) => (
            <li
              key={pokemon.name}
              draggable
              onDragStart={(event) => {
                setDragging(i);
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setOver(i);
              }}
              onDragLeave={() => setOver((current) => (current === i ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                if (dragging !== null) move(dragging, i);
                setDragging(null);
                setOver(null);
              }}
              onDragEnd={() => {
                setDragging(null);
                setOver(null);
              }}
              className={cn(
                "border-border bg-surface flex items-center gap-2 rounded-2xl border-2 p-2 transition-all",
                dragging === i && "opacity-40",
                over === i && dragging !== i && "border-primary-600 scale-[1.01]",
                selected === i && "border-primary-600 ring-primary-600/30 ring-4",
              )}
              data-testid="order-item"
            >
              <GripVertical aria-hidden className="text-muted size-5 shrink-0 cursor-grab" />
              <button
                type="button"
                aria-pressed={selected === i}
                onClick={() => select(i)}
                className="flex min-h-11 min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 rounded-xl text-left"
              >
                <span className="font-display w-5 text-center text-xs">{i + 1}</span>
                <GymPokemon
                  pokemon={pokemon}
                  compact
                  showTypes
                  className={cn(
                    "w-28 shrink-0 border-0",
                    health?.[i]?.hp === 0 && "opacity-40 grayscale",
                  )}
                />
                {health?.[i] && (
                  <div className="grid min-w-28 gap-1" data-testid="member-hp">
                    {health[i].hp === 0 ? (
                      <span className="text-xs font-bold">{m.gauntlet.fainted}</span>
                    ) : (
                      <>
                        <div className="bg-border h-2 overflow-hidden rounded-full" aria-hidden>
                          <div
                            className={cn(
                              "h-full",
                              health[i].hp / health[i].max > 0.5
                                ? "bg-green-500"
                                : health[i].hp / health[i].max > 0.2
                                  ? "bg-amber-400"
                                  : "bg-red-500",
                            )}
                            style={{ width: `${(health[i].hp / health[i].max) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums">
                          PS {health[i].hp} / {health[i].max}
                        </span>
                      </>
                    )}
                  </div>
                )}
                {reveal && (
                  <div className="min-w-36 flex-1">
                    <MiniStats pokemon={pokemon} />
                  </div>
                )}
                {opponentLead && <MatchupTag fit={matchup(pokemon)} against={opponentLead} />}
              </button>
              <div className="flex shrink-0 flex-col sm:flex-row">
                <Button
                  variant="ghost"
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                  aria-label={m.moveUp(formatName(pokemon.name))}
                >
                  <ArrowUp aria-hidden className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  disabled={i === team.length - 1}
                  onClick={() => move(i, i + 1)}
                  aria-label={m.moveDown(formatName(pokemon.name))}
                >
                  <ArrowDown aria-hidden className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
