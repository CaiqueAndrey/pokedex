"use client";

import { FastForward } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { TYPE_LABELS, messages } from "@/config/messages";
import { formatName } from "@/lib/format";
import type { BattleEvent, BattlePokemon, BattleResult, Side } from "@/types/battle";
import { BATTLE_SPEEDS } from "@/config/gym";
import { PokemonImage } from "../pokedex/pokemon-image";
import { SpeedToggle } from "./speed-toggle";
import { useBattleSpeed } from "./use-gym";

const m = messages.gym;

interface Snapshot {
  active: Record<Side, number>;
  hp: Record<Side, number[]>;
  hits: Record<Side, number>;
  log: string[];
}

/** Replays events [0, step) into what the screen should show. Pure, so skipping is trivial. */
function replay(
  result: BattleResult,
  step: number,
  teams: Record<Side, BattlePokemon[]>,
  trainer: string,
): Snapshot {
  const state: Snapshot = {
    active: { player: 0, opponent: 0 },
    hp: { player: [...result.maxHp.player], opponent: [...result.maxHp.opponent] },
    hits: { player: 0, opponent: 0 },
    log: [],
  };
  const name = (side: Side, index: number) => formatName(teams[side][index]?.name ?? "");
  const describe = (event: BattleEvent): string[] => {
    switch (event.kind) {
      case "send":
        return [
          event.side === "player"
            ? m.youSend(name("player", event.index))
            : m.sends(trainer, name("opponent", event.index)),
        ];
      case "attack": {
        const attacker = name(event.side, event.attacker);
        if (event.struggle) return [m.struggle(attacker)];
        const lines = [m.attack(attacker, TYPE_LABELS[event.type])];
        if (event.critical) lines.push(m.critical);
        if (event.effectiveness > 1) lines.push(m.superEffective);
        if (event.effectiveness < 1) lines.push(m.notVeryEffective);
        return lines;
      }
      case "faint":
        return [m.faint(name(event.side, event.index))];
      case "end":
        return [event.winner === "player" ? m.wonBattle : m.lostBattle];
    }
  };

  for (const event of result.events.slice(0, step)) {
    if (event.kind === "send") state.active[event.side] = event.index;
    if (event.kind === "attack") {
      const target: Side = event.side === "player" ? "opponent" : "player";
      state.hp[target][event.defender] = event.hpLeft;
      state.hits[target]++;
    }
    state.log.push(...describe(event));
  }
  return state;
}

function Fighter({
  side,
  pokemon,
  hp,
  maxHp,
  hits,
  team,
  teamHp,
  label,
}: {
  side: Side;
  pokemon: BattlePokemon | undefined;
  hp: number;
  maxHp: number;
  hits: number;
  team: BattlePokemon[];
  teamHp: number[];
  label: string;
}) {
  const ratio = maxHp > 0 ? hp / maxHp : 0;
  const color = ratio > 0.5 ? "bg-green-500" : ratio > 0.2 ? "bg-amber-400" : "bg-red-500";
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        side === "opponent" ? "flex-row-reverse text-right" : "",
      )}
      data-testid={`fighter-${side}`}
    >
      <div
        key={hits}
        className={cn(
          "relative size-28 shrink-0 sm:size-36",
          hits > 0 && "motion-safe:animate-pop",
          hp === 0 && "opacity-30 grayscale transition-all duration-500",
        )}
      >
        {pokemon && (
          <PokemonImage
            id={pokemon.id}
            alt=""
            sizes="144px"
            className="animate-float object-contain"
          />
        )}
      </div>
      <div className="border-border bg-surface min-w-0 flex-1 rounded-xl border-2 p-3 shadow-[3px_3px_0_0_var(--border)]">
        <p className="text-muted text-xs">{label}</p>
        <p className="font-display truncate text-[0.65rem] leading-relaxed">
          {pokemon ? formatName(pokemon.name) : ""}
        </p>
        <div
          className="bg-border mt-1 h-3 overflow-hidden rounded-full"
          role="meter"
          aria-label={`PS ${pokemon ? formatName(pokemon.name) : ""}`}
          aria-valuemin={0}
          aria-valuemax={maxHp}
          aria-valuenow={hp}
        >
          <div
            className={cn("h-full transition-all duration-500", color)}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
        <p className="mt-1 text-sm tabular-nums">
          {hp} / {maxHp}
        </p>
        <div className={cn("mt-1 flex gap-1", side === "opponent" && "justify-end")} aria-hidden>
          {team.map((member, i) => (
            <span
              key={member.name}
              className={cn(
                "size-3 rounded-full border border-black/40",
                (teamHp[i] ?? 0) > 0 ? "bg-primary-600" : "bg-border",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function BattleView({
  result,
  team,
  opponent,
  trainer,
  onDone,
  doneLabel,
}: {
  result: BattleResult;
  team: BattlePokemon[];
  opponent: BattlePokemon[];
  trainer: string;
  onDone: () => void;
  doneLabel: string;
}) {
  const [step, setStep] = useState(0);
  const { speed } = useBattleSpeed();
  const total = result.events.length;
  const finished = step >= total;

  useEffect(() => {
    if (finished) return;
    const timer = setTimeout(() => setStep((s) => s + 1), BATTLE_SPEEDS[speed]);
    return () => clearTimeout(timer);
  }, [finished, step, speed]);

  const teams = { player: team, opponent };
  const view = replay(result, step, teams, trainer);
  const fighter = (side: Side) => ({
    pokemon: teams[side][view.active[side]],
    hp: view.hp[side][view.active[side]] ?? 0,
    maxHp: result.maxHp[side][view.active[side]] ?? 0,
  });

  return (
    <div className="grid gap-4">
      <div className="from-surface border-border relative grid gap-6 overflow-hidden rounded-3xl border-2 bg-linear-to-b to-green-500/20 p-4 shadow-[4px_4px_0_0_var(--border)]">
        <Fighter
          side="opponent"
          label={trainer}
          {...fighter("opponent")}
          hits={view.hits.opponent}
          team={opponent}
          teamHp={view.hp.opponent}
        />
        <Fighter
          side="player"
          label={m.you}
          {...fighter("player")}
          hits={view.hits.player}
          team={team}
          teamHp={view.hp.player}
        />
      </div>

      <div
        className="border-border bg-background font-display min-h-28 rounded-2xl border-4 p-3 text-[0.6rem] leading-loose"
        aria-live="polite"
        data-testid="battle-log"
      >
        {view.log.slice(-3).map((line, i) => (
          <p key={`${view.log.length}-${i}`} className="animate-fade-up">
            {line}
          </p>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SpeedToggle />
        {finished ? (
          <Button onClick={onDone} className="animate-pop">
            {doneLabel}
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => setStep(total)}>
            <FastForward aria-hidden className="size-4" />
            {m.skip}
          </Button>
        )}
      </div>
    </div>
  );
}
