"use client";

import { RotateCcw } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { messages } from "@/config/messages";
import { GYM } from "@/config/gym";
import {
  applyResult,
  battleFor,
  byName,
  opponentFor,
  pickPokemon,
  playerTeam,
  reorder,
  reroll,
  startRun,
  type GymMode,
  type GymRun,
} from "@/lib/battle/run";
import { newSeed } from "@/lib/battle/rng";
import type { BattlePokemon, BattleResult } from "@/types/battle";
import type { TypeRelations } from "@/types/pokemon";
import { BattleView } from "./battle-view";
import { BoulderBadge } from "./boulder-badge";
import { DraftBoard } from "./draft-board";
import { GymPokemon } from "./gym-pokemon";
import { PreBattle } from "./pre-battle";
import { RunPath } from "./run-path";
import { SpeedToggle } from "./speed-toggle";
import { useBadges, useGymRun } from "./use-gym";

const m = messages.gym;

interface ActiveBattle {
  result: BattleResult;
  team: BattlePokemon[];
  opponent: BattlePokemon[];
  trainer: string;
  next: GymRun;
}

export function GymGame({
  pool,
  relations,
  seed,
}: {
  pool: BattlePokemon[];
  relations: TypeRelations;
  /** Optional fixed seed (from `?seed=`) for shareable or testable runs. */
  seed?: string;
}) {
  const { run, setRun } = useGymRun();
  const { badges, add: addBadge } = useBadges();
  const [battle, setBattle] = useState<ActiveBattle | null>(null);
  const names = useMemo(() => byName(pool), [pool]);

  // A saved run that no longer matches the pool (e.g. after a data update) is discarded.
  const valid = run && run.picks.every((name) => names.has(name)) ? run : null;
  const team = valid ? playerTeam(valid, pool) : [];
  const hasBadge = badges.includes(GYM.id);

  function start(mode: GymMode = valid?.mode ?? "easy") {
    setRun(startRun(seed ?? newSeed(), mode));
  }

  function fight(current: GymRun) {
    const result = battleFor(current, pool, relations);
    const next = applyResult(current, result, pool);
    // The outcome is saved before the animation: reloading can't re-roll a lost battle.
    setRun(next);
    if (next.phase === "won") addBadge(GYM.id);
    window.scrollTo({ top: 0 });
    setBattle({
      result,
      team: playerTeam(current, pool),
      opponent: opponentFor(current, current.battle, pool),
      trainer: GYM.battles[current.battle]?.trainer ?? "",
      next,
    });
  }

  if (battle) {
    const doneLabel =
      battle.next.phase === "ready"
        ? m.next
        : battle.result.winner === "player"
          ? m.wonBattle
          : m.lostBattle;
    return (
      <BattleView
        key={`${battle.next.seed}-${battle.next.battle}-${battle.next.phase}`}
        {...battle}
        doneLabel={doneLabel}
        onDone={() => setBattle(null)}
      />
    );
  }

  if (!valid) {
    return (
      <>
        <PageHeader title={m.title} description={m.description} />
        <div className="grid gap-6 md:grid-cols-[1fr_auto]">
          <Card className="animate-fade-up grid gap-4">
            <h2 className="text-xs sm:text-sm">{m.rulesTitle}</h2>
            <ol className="grid list-decimal gap-2 pl-5 text-base">
              {m.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
            <h2 className="text-xs">{m.modeTitle}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["easy", "hard"] as const).map((mode) => (
                <div key={mode} className="border-border grid gap-2 rounded-2xl border-2 p-3">
                  <p className="font-display text-[0.65rem]">{m.modes[mode].label}</p>
                  <p className="text-muted text-sm">{m.modes[mode].description}</p>
                  <Button
                    variant={mode === "easy" ? "primary" : "secondary"}
                    onClick={() => start(mode)}
                    aria-label={`${m.start}: ${m.modes[mode].label}`}
                  >
                    {m.start}
                  </Button>
                </div>
              ))}
            </div>
            <SpeedToggle />
          </Card>
          <div className="grid gap-4 md:w-56">
            <Card className="flex items-end justify-center gap-3 overflow-hidden pb-0">
              <Image
                src="/img/Brock.png"
                alt={GYM.leader}
                width={244}
                height={478}
                priority
                className="animate-fade-up h-44 w-auto"
              />
              <p className="font-display mb-4 text-[0.6rem] leading-relaxed">
                {GYM.leader}
                <br />
                <span className="text-muted">{m.leader}</span>
              </p>
            </Card>
            <Card className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-[0.65rem]">{m.badges}</h2>
              <BoulderBadge earned={hasBadge} label={GYM.badge} className="size-24" />
              <p className="text-sm">{hasBadge ? GYM.badge : m.noBadges}</p>
            </Card>
          </div>
        </div>
      </>
    );
  }

  // During a run a one-line bar replaces the page header, leaving the screen to the game.
  const runBar = (
    <div className="text-muted -mt-2 mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h1 className="font-display text-foreground text-[0.65rem]">{m.title}</h1>
        <span>
          {m.modeBadge(m.modes[valid.mode].label)} · {m.seed(valid.seed)}
        </span>
      </div>
      <Button variant="ghost" onClick={() => setRun(null)}>
        <RotateCcw aria-hidden className="size-4" />
        {valid.phase === "won" || valid.phase === "lost" ? m.newRun : m.abandon}
      </Button>
    </div>
  );

  if (valid.phase === "draft") {
    return (
      <>
        {runBar}
        <DraftBoard
          run={valid}
          pool={pool}
          team={team}
          relations={relations}
          onPick={(name) => setRun(pickPokemon(valid, name, pool))}
          onReroll={() => setRun(reroll(valid))}
        />
      </>
    );
  }

  if (valid.phase === "ready") {
    return (
      <>
        {runBar}
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <PreBattle
            battle={valid.battle}
            mode={valid.mode}
            team={team}
            opponent={opponentFor(valid, valid.battle, pool)}
            onReorder={(order) => setRun(reorder(valid, order))}
            onFight={() => fight(valid)}
          />
          <RunPath run={valid} pool={pool} />
        </div>
      </>
    );
  }

  const won = valid.phase === "won";
  return (
    <>
      {runBar}
      <Card
        className="animate-fade-up flex flex-col items-center gap-4 py-10 text-center"
        data-testid="run-result"
      >
        {won ? (
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Image
              src="/img/championKanto.png"
              alt={m.championAlt}
              width={1254}
              height={1254}
              priority
              className="animate-pop size-48 rounded-2xl sm:size-56"
            />
            <BoulderBadge label={GYM.badge} className="animate-float size-28" />
          </div>
        ) : (
          <Image
            src="/img/game_over.png"
            alt={m.gameOverAlt}
            width={1536}
            height={1024}
            priority
            className="animate-fade-up h-auto w-full max-w-md rounded-2xl"
          />
        )}
        <h2 className="text-sm sm:text-base">{won ? m.wonTitle : m.lostTitle}</h2>
        <p className="max-w-md text-base">
          {won ? m.wonDescription : m.lostDescription(valid.battle)}
        </p>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {team.map((pokemon) => (
            <li key={pokemon.name}>
              <GymPokemon pokemon={pokemon} compact />
            </li>
          ))}
        </ul>
        <Button onClick={() => start()}>{m.newRun}</Button>
      </Card>
      <div className="mt-6">
        <RunPath run={valid} pool={pool} />
      </div>
    </>
  );
}
