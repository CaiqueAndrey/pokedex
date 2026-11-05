"use client";

import { FastForward } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { TypeBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { TYPE_LABELS, messages } from "@/config/messages";
import { formatName } from "@/lib/format";
import type { BattleEvent, BattlePokemon, BattleResult, Side } from "@/types/battle";
import { BATTLE_SPEEDS } from "@/config/gym";
import { battleEventTune } from "@/lib/sound/tunes";
import { PokemonImage } from "../pokedex/pokemon-image";
import { SoundToggle } from "./sound-toggle";
import { SpeedToggle } from "./speed-toggle";
import { haptic, sfx, useBattleSpeed } from "./use-gym";

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
    hp: { player: [...result.startHp.player], opponent: [...result.startHp.opponent] },
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
        if (event.struggle) {
          const lines = [m.struggle(attacker)];
          if (event.recoil) lines.push(m.recoil(attacker));
          return lines;
        }
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
      if (event.attackerHpLeft !== undefined) {
        state.hp[event.side][event.attacker] = event.attackerHpLeft;
      }
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
          "relative size-24 shrink-0 sm:size-36",
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
      <div className="border-border bg-surface min-w-0 flex-1 rounded-xl border-2 p-2 shadow-[3px_3px_0_0_var(--border)] sm:p-3">
        <p className="text-muted text-xs">{label}</p>
        <p className="font-display truncate text-[0.65rem] leading-relaxed">
          {pokemon ? formatName(pokemon.name) : ""}
        </p>
        {pokemon && (
          <div
            className={cn("my-1 flex flex-wrap gap-1", side === "opponent" && "justify-end")}
            data-testid={`fighter-types-${side}`}
          >
            {pokemon.types.map((type) => (
              <TypeBadge key={type} type={type} className="px-2 py-0 text-[0.7rem]" />
            ))}
          </div>
        )}
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
        <p className="mt-0.5 text-sm tabular-nums">
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
  playerName,
  heading,
  trainerImage,
  onDone,
  doneLabel,
  doneHint,
  badge = false,
  children,
}: {
  result: BattleResult;
  team: BattlePokemon[];
  opponent: BattlePokemon[];
  trainer: string;
  /** The player's trainer name (or "Você"). */
  playerName: string;
  /** Where we are, e.g. "Ginásio de Pewter · Batalha 3 de 5". */
  heading: string;
  /** The opponent's artwork for the "VS" intro (leaders and bosses). */
  trainerImage?: string;
  onDone: () => void;
  doneLabel: string;
  /** Shown next to the "done" button (e.g. who's next). */
  doneHint?: string;
  /** This battle wins the badge: the ending plays the fanfare instead of the victory jingle. */
  badge?: boolean;
  /** Replaces the "done" button once the battle ends (the end-of-run dialog); null keeps it. */
  children?: ReactNode;
}) {
  const [step, setStep] = useState(0);
  const [intro, setIntro] = useState(true);
  const { speed } = useBattleSpeed();
  const total = result.events.length;
  const finished = step >= total;
  const played = useRef(0);

  // The "VS" card first, like a trainer battle in the games; then the events play out.
  useEffect(() => {
    if (!intro) return;
    const timer = setTimeout(() => setIntro(false), speed === "fast" ? 800 : 1600);
    return () => clearTimeout(timer);
  }, [intro, speed]);

  useEffect(() => {
    if (finished || intro) return;
    const timer = setTimeout(() => setStep((s) => s + 1), BATTLE_SPEEDS[speed]);
    return () => clearTimeout(timer);
  }, [finished, intro, step, speed]);

  // One effect per new event; skipping jumps straight to the ending sound.
  useEffect(() => {
    if (step <= played.current) return;
    const skipped = step - played.current > 1;
    played.current = step;
    const event = result.events[step - 1];
    if (!event) return;
    if (event.kind === "end") {
      sfx(event.winner === "player" ? (badge ? "badge" : "battleWon") : "battleLost");
      return;
    }
    if (skipped) return;
    const tune = battleEventTune(event);
    if (tune) sfx(tune);
    if (event.kind === "faint" && event.side === "player") haptic(120);
    if (event.kind === "attack" && event.critical) haptic([30, 40, 30]);
  }, [step, result.events, badge]);

  const teams = { player: team, opponent };
  const view = replay(result, step, teams, trainer);
  const fighter = (side: Side) => ({
    pokemon: teams[side][view.active[side]],
    hp: view.hp[side][view.active[side]] ?? 0,
    maxHp: result.maxHp[side][view.active[side]] ?? 0,
  });

  return (
    <div className="grid gap-3 sm:gap-4">
      <div
        className="border-border bg-surface flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 px-3 py-2"
        data-testid="battle-header"
      >
        <span className="text-muted text-sm">{heading}</span>
        <span className="font-display text-[0.6rem] leading-relaxed">
          {playerName} <span className="text-primary-600">×</span> {trainer}
        </span>
      </div>
      <div className="from-surface border-border relative grid gap-3 overflow-hidden rounded-3xl border-2 bg-linear-to-b to-green-500/20 p-3 shadow-[4px_4px_0_0_var(--border)]">
        {intro && (
          <div
            className="bg-foreground/90 text-background absolute inset-0 z-20 grid place-items-center p-4 text-center"
            data-testid="battle-intro"
            role="status"
          >
            <div className="grid justify-items-center gap-3">
              {trainerImage && (
                <div className="motion-safe:animate-pop relative h-28 w-24">
                  <Image src={trainerImage} alt="" fill sizes="96px" className="object-contain" />
                </div>
              )}
              <p className="font-display text-xs leading-relaxed sm:text-sm">
                {m.vsTitle(trainer)}
              </p>
              <p className="font-display flex items-center gap-3 text-[0.65rem]">
                <span>{playerName}</span>
                <span className="bg-primary-600 text-on-primary motion-safe:animate-pop rounded-lg px-2 py-1 text-sm">
                  VS
                </span>
                <span>{trainer}</span>
              </p>
            </div>
          </div>
        )}
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
          label={playerName}
          {...fighter("player")}
          hits={view.hits.player}
          team={team}
          teamHp={view.hp.player}
        />
      </div>

      <div
        className="border-border bg-background font-display min-h-20 rounded-2xl border-4 p-2 text-[0.6rem] leading-loose sm:min-h-28 sm:p-3"
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
        <div className="flex flex-wrap items-center gap-2">
          <SpeedToggle />
          <SoundToggle />
        </div>
        {finished ? (
          (children ?? (
            <div className="flex flex-wrap items-center gap-3">
              {doneHint && (
                <p className="font-display text-[0.6rem]" role="status">
                  {doneHint}
                </p>
              )}
              <Button onClick={onDone} className="animate-pop">
                {doneLabel}
              </Button>
            </div>
          ))
        ) : (
          <Button
            variant="secondary"
            onClick={() => {
              setIntro(false);
              setStep(total);
            }}
          >
            <FastForward aria-hidden className="size-4" />
            {m.skip}
          </Button>
        )}
      </div>
    </div>
  );
}
