"use client";

import { CalendarDays, RotateCcw } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { messages } from "@/config/messages";
import {
  GYMS,
  RULES_VERSION,
  SELECTABLE_MODES,
  type AchievementId,
  type GymMode,
} from "@/config/gym";
import { battlesWon, dailySeed, formatDailyDate, rewardFor } from "@/lib/battle/progress";
import {
  applyResult,
  battleFor,
  byName,
  countersLead,
  gymOf,
  opponentFor,
  pickPokemon,
  playerTeam,
  reorder,
  reroll,
  startRun,
  trainerFor,
  type GymRun,
} from "@/lib/battle/run";
import { newSeed } from "@/lib/battle/rng";
import type { BattlePokemon, BattleResult } from "@/types/battle";
import type { TypeRelations } from "@/types/pokemon";
import { BattleView } from "./battle-view";
import { BallIcon } from "./ball-icon";
import { DraftBoard } from "./draft-board";
import { GymBadge } from "./gym-badge";
import { GymPokemon } from "./gym-pokemon";
import { GymProgress } from "./gym-progress";
import { PreBattle } from "./pre-battle";
import { RunPath } from "./run-path";
import { RocketDuo, RunResultDialog } from "./run-result-dialog";
import { ShareButton } from "./share-button";
import { SoundToggle } from "./sound-toggle";
import { SpeedToggle } from "./speed-toggle";
import {
  recordAbandonedDaily,
  recordFinishedRun,
  sfx,
  useBadges,
  useGymProgress,
  useGymRun,
  useToday,
} from "./use-gym";

const m = messages.gym;

interface ActiveBattle {
  result: BattleResult;
  team: BattlePokemon[];
  opponent: BattlePokemon[];
  trainer: string;
  next: GymRun;
  /** Achievements unlocked by this battle's outcome (only when it ends the run). */
  unlocked: AchievementId[];
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
  const { stats, achievements, daily } = useGymProgress();
  const today = useToday();
  const [battle, setBattle] = useState<ActiveBattle | null>(null);
  const [chosenMode, setChosenMode] = useState<GymMode | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const names = useMemo(() => byName(pool), [pool]);

  // A saved run that no longer matches the pool (e.g. after a data update) or that was started
  // under older rules (its opponents would change mid-run) is discarded.
  const outdated = run !== null && run.rules !== RULES_VERSION;
  const valid = run && !outdated && run.picks.every((name) => names.has(name)) ? run : null;
  const team = valid ? playerTeam(valid, pool) : [];
  const mode = chosenMode ?? stats.lastMode ?? "easy";
  const selected = GYMS[mode];
  const todayResult = daily.find((entry) => entry.date === today);

  function start(daily = false) {
    sfx("roll");
    setChosenMode(mode);
    setRun(daily ? startRun(dailySeed(today), "daily", today) : startRun(seed ?? newSeed(), mode));
  }

  /** Back to the start screen, where the mode is always chosen again. */
  function newRun() {
    setBattle(null);
    setRun(null);
    window.scrollTo({ top: 0 });
  }

  function abandon() {
    if (valid?.daily) recordAbandonedDaily(valid);
    setConfirmAbandon(false);
    newRun();
  }

  function fight(current: GymRun) {
    const result = battleFor(current, pool, relations);
    const next = applyResult(current, result, pool, relations);
    // The outcome is saved before the animation: reloading can't re-roll a lost battle.
    setRun(next);
    const over = next.phase === "won" || next.phase === "lost";
    const badgeId = gymOf(next).badgeId;
    if (next.phase === "won" && badgeId) addBadge(badgeId);
    const unlocked = over ? recordFinishedRun(next, pool) : [];
    window.scrollTo({ top: 0 });
    setBattle({
      result,
      team: playerTeam(current, pool),
      opponent: opponentFor(current, current.battle, pool, relations),
      trainer: trainerFor(current, current.battle),
      next,
      unlocked,
    });
  }

  if (battle) {
    const over = battle.next.phase !== "ready";
    const nextTrainer = trainerFor(battle.next, battle.next.battle);
    return (
      <BattleView
        key={`${battle.next.seed}-${battle.next.battle}-${battle.next.phase}`}
        {...battle}
        doneLabel={m.next}
        doneHint={over ? undefined : m.wonNext(nextTrainer)}
        badge={battle.next.phase === "won"}
        onDone={() => setBattle(null)}
      >
        {over ? (
          <RunResultDialog
            run={battle.next}
            streak={stats.streak}
            unlocked={battle.unlocked}
            onHistory={() => setBattle(null)}
            onNewRun={newRun}
          />
        ) : null}
      </BattleView>
    );
  }

  if (!valid) {
    return (
      <>
        <PageHeader title={m.title} description={m.description} />
        {outdated && (
          <p
            className="border-border bg-surface mb-4 rounded-2xl border-2 p-3 text-sm"
            role="status"
          >
            {m.outdatedRun}
          </p>
        )}
        <div className="grid gap-6 md:grid-cols-[1fr_auto]">
          <Card className="animate-fade-up grid gap-4">
            <h2 className="text-xs sm:text-sm">{m.rulesTitle}</h2>
            <ol className="grid list-decimal gap-2 pl-5 text-base">
              {m.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
            <h2 id="mode-title" className="text-xs">
              {m.modeTitle}
            </h2>
            <div
              role="radiogroup"
              aria-labelledby="mode-title"
              className="grid gap-3 sm:grid-cols-2"
            >
              {SELECTABLE_MODES.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={mode === value}
                  onClick={() => {
                    sfx("click");
                    setChosenMode(value);
                  }}
                  className={cn(
                    "grid gap-2 rounded-2xl border-2 p-3 text-left transition-all",
                    mode === value
                      ? "border-primary-600 bg-primary-600/10 ring-primary-600/30 ring-4"
                      : "border-border hover:bg-border/40",
                  )}
                  data-testid={`mode-${value}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-display text-[0.65rem]">{m.modes[value].label}</span>
                    <span className="text-muted text-xs">{GYMS[value].leader}</span>
                  </span>
                  <span className="text-muted text-sm">{m.modes[value].description}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => start()}>{m.startSelected(m.modes[mode].label)}</Button>
            </div>
            {today && (
              <section
                aria-labelledby="daily-title"
                className="border-border flex flex-wrap items-center gap-4 rounded-2xl border-2 border-dashed p-3"
                data-testid="daily"
              >
                <RocketDuo className="shrink-0 [&_img]:h-20 [&_img:last-child]:h-24" />
                <div className="grid min-w-48 flex-1 gap-2 text-sm">
                  <h2 id="daily-title" className="text-[0.65rem]">
                    {m.daily} · {formatDailyDate(today)}
                  </h2>
                  {todayResult ? (
                    <>
                      <p>{m.dailyDone(formatDailyDate(today), todayResult.battlesWon)}</p>
                      <div>
                        <ShareButton result={{ ...todayResult, mode: "daily", daily: today }} />
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-muted">{m.dailyHint}</p>
                      <div>
                        <Button variant="secondary" onClick={() => start(true)}>
                          <CalendarDays aria-hidden className="size-4" />
                          {m.dailyStart(formatDailyDate(today))}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </section>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <SpeedToggle />
              <SoundToggle />
            </div>
          </Card>
          <div className="grid content-start gap-4 md:w-56">
            <Card className="flex items-end justify-center gap-3 overflow-hidden pb-0">
              <div key={mode} className="animate-fade-up relative h-44 w-24 shrink-0">
                <Image
                  src={selected.leaderImage}
                  alt={selected.leader}
                  fill
                  sizes="96px"
                  priority
                  className="object-contain object-bottom"
                />
              </div>
              <p className="font-display mb-4 text-[0.6rem] leading-relaxed">
                {selected.leader}
                <br />
                <span className="text-muted">{m.leader}</span>
                <br />
                <span className="text-muted">{selected.name}</span>
              </p>
            </Card>
            <Card className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-[0.65rem]">{m.badges}</h2>
              <ul className="flex gap-3">
                {SELECTABLE_MODES.map((value) => {
                  const gym = GYMS[value];
                  if (!gym.badgeId || !gym.badge || !gym.badgeImage) return null;
                  const earned = badges.includes(gym.badgeId);
                  return (
                    <li key={value} className="grid justify-items-center gap-1">
                      <GymBadge
                        src={gym.badgeImage}
                        label={gym.badge}
                        earned={earned}
                        className="size-16"
                      />
                      <span className={cn("text-xs", !earned && "text-muted")}>{gym.badge}</span>
                    </li>
                  );
                })}
              </ul>
              {!SELECTABLE_MODES.some((value) => badges.includes(GYMS[value].badgeId ?? "")) && (
                <p className="text-sm">{m.noBadges}</p>
              )}
            </Card>
          </div>
        </div>
        <div className="mt-6">
          <GymProgress stats={stats} achievements={achievements} />
        </div>
      </>
    );
  }

  const over = valid.phase === "won" || valid.phase === "lost";
  // During a run a one-line bar replaces the page header, leaving the screen to the game.
  const runBar = (
    <div className="text-muted -mt-2 mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h1 className="font-display text-foreground text-[0.65rem]">{gymOf(valid).name}</h1>
        <span>
          {valid.daily
            ? `${m.dailyBadge} ${formatDailyDate(valid.daily)}`
            : `${m.modeBadge(m.modes[valid.mode].label)} · ${m.seed(valid.seed)}`}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <SoundToggle />
        <Button variant="ghost" onClick={() => (over ? newRun() : setConfirmAbandon(true))}>
          <RotateCcw aria-hidden className="size-4" />
          {over ? m.newRun : m.abandon}
        </Button>
      </div>
      {confirmAbandon && (
        <Dialog open title={m.abandonTitle} onClose={() => setConfirmAbandon(false)}>
          <p className="text-foreground mb-2 text-center text-base">{m.abandonDescription}</p>
          {valid.daily && <p className="mb-2 text-center text-sm">{m.abandonDaily}</p>}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={abandon}>
              {m.abandonConfirm}
            </Button>
            <Button onClick={() => setConfirmAbandon(false)} autoFocus>
              {m.keepPlaying}
            </Button>
          </div>
        </Dialog>
      )}
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
          onPick={(name) => {
            sfx("pick");
            setRun(pickPokemon(valid, name, pool));
          }}
          onReroll={() => {
            sfx("roll");
            setRun(reroll(valid));
          }}
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
            trainer={trainerFor(valid, valid.battle)}
            team={team}
            opponent={opponentFor(valid, valid.battle, pool, relations)}
            relations={relations}
            counters={gymOf(valid).rules.reveal && countersLead(valid, valid.battle)}
            onReorder={(order) => setRun(reorder(valid, order))}
            onFight={() => fight(valid)}
          />
          <RunPath run={valid} pool={pool} />
        </div>
      </>
    );
  }

  // After the end-of-run dialog (or a reload): the history comes first.
  const won = valid.phase === "won";
  const wins = battlesWon(valid);
  const gym = gymOf(valid);
  const reward = rewardFor(valid);
  return (
    <>
      {runBar}
      <Card
        className="animate-fade-up mb-6 flex flex-wrap items-center justify-between gap-4"
        data-testid="run-result"
      >
        <div className="flex items-center gap-4">
          {won && gym.badge && gym.badgeImage && (
            <GymBadge src={gym.badgeImage} label={gym.badge} className="size-16 shrink-0" />
          )}
          <div className="grid gap-1">
            <h2 className="text-xs sm:text-sm">{won ? m.wonTitles[valid.mode] : m.lostTitle}</h2>
            <p className="text-base">
              {won
                ? valid.mode === "daily"
                  ? m.resultRocket
                  : m.resultWon(gym.name)
                : m.resultLost(wins)}
            </p>
            {reward && (
              <p className="flex items-center gap-2 text-sm">
                <BallIcon ball={reward} />
                {m.ballWon(m.balls[reward])}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ShareButton
            result={{
              mode: valid.mode,
              battlesWon: wins,
              won,
              daily: valid.daily,
              seed: valid.seed,
            }}
          />
          <Button onClick={newRun}>
            <RotateCcw aria-hidden className="size-4" />
            {m.newRun}
          </Button>
        </div>
        <ul className="grid w-full grid-cols-3 gap-2 sm:grid-cols-6">
          {team.map((pokemon) => (
            <li key={pokemon.name}>
              <GymPokemon pokemon={pokemon} compact />
            </li>
          ))}
        </ul>
      </Card>
      <RunPath run={valid} pool={pool} />
    </>
  );
}
