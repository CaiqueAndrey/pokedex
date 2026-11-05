"use client";

import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { messages } from "@/config/messages";
import { RULES_VERSION, type AchievementId, type GymMode } from "@/config/gym";
import {
  battlesWon,
  dailyItem,
  dailySeed,
  formatDailyDate,
  rewardFor,
} from "@/lib/battle/progress";
import {
  applyResult,
  battleFor,
  byName,
  countersLead,
  currentDraft,
  gymOf,
  opponentFor,
  pickPokemon,
  playerTeam,
  reorder,
  reroll,
  startRun,
  trainerFor,
  type GymRun,
  type StartOptions,
} from "@/lib/battle/run";
import { newSeed } from "@/lib/battle/rng";
import type { BattlePokemon, BattleResult } from "@/types/battle";
import type { GameItem } from "@/types/item";
import type { TypeRelations } from "@/types/pokemon";
import { BattleView } from "./battle-view";
import { BallIcon } from "./ball-icon";
import { DraftBoard } from "./draft-board";
import { GymBadge } from "./gym-badge";
import { GymPokemon } from "./gym-pokemon";
import { GymHub, Section } from "./gym-hub";
import { GymRewards } from "./gym-rewards";
import { PreBattle } from "./pre-battle";
import { RunPath } from "./run-path";
import { RunResultDialog } from "./run-result-dialog";
import { ShareButton } from "./share-button";
import { SoundToggle } from "./sound-toggle";
import { SpeedToggle } from "./speed-toggle";
import {
  recordAbandonedDaily,
  recordCatch,
  recordFinishedRun,
  sfx,
  takeMasterBall,
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
  items,
  seed,
}: {
  /** Regular Pokémon plus legendaries (flagged `legendary`). */
  pool: BattlePokemon[];
  relations: TypeRelations;
  /** Reward items from the PokeAPI (sprites); empty if the API was unavailable. */
  items: GameItem[];
  /** Optional fixed seed (from `?seed=`) for shareable or testable runs. */
  seed?: string;
}) {
  const { run, setRun } = useGymRun();
  const { badges, add: addBadge } = useBadges();
  const { stats, achievements, daily, bag } = useGymProgress();
  const { today, secondsLeft } = useToday();
  const [battle, setBattle] = useState<ActiveBattle | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const names = useMemo(() => byName(pool), [pool]);
  const legendaries = useMemo(() => pool.filter((p) => p.legendary), [pool]);

  // A saved run that no longer matches the pool (e.g. after a data update) or that was started
  // under older rules (its opponents would change mid-run) is discarded.
  const outdated = run !== null && run.rules !== RULES_VERSION;
  const valid = run && !outdated && run.picks.every((name) => names.has(name)) ? run : null;
  const team = valid ? playerTeam(valid, pool) : [];
  const itemFor = (run: GymRun) => {
    if (run.mode !== "daily" || run.phase !== "won" || run.practice || !run.daily) return undefined;
    const name = dailyItem(run.daily);
    return items.find((item) => item.name === name);
  };

  /** Starts a run from the hub. A legendary encounter spends a Master Ball up front. */
  function start(mode: GymMode, options: StartOptions = {}) {
    const legendary = Boolean(options.legendary) && mode !== "daily" && takeMasterBall();
    sfx("roll");
    const runSeed = options.daily ? dailySeed(options.daily) : (seed ?? newSeed());
    setRun(startRun(runSeed, mode, { ...options, legendary }));
    window.scrollTo({ top: 0 });
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
    if (next.phase === "won" && badgeId && !next.practice) addBadge(badgeId);
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
            item={itemFor(battle.next)}
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
      <div className="grid gap-10">
        {outdated && (
          <p className="border-border bg-surface rounded-2xl border-2 p-3 text-sm" role="status">
            {m.outdatedRun}
          </p>
        )}
        <GymHub
          lastMode={stats.lastMode}
          stats={stats}
          badges={badges}
          daily={daily}
          today={today}
          secondsLeft={secondsLeft}
          items={items}
          onStart={start}
        />
        <GymRewards
          stats={stats}
          badges={badges}
          achievements={achievements}
          bag={bag}
          items={items}
          legendaries={legendaries}
        />
        <Section id="regras" title={m.rulesTitle}>
          <Card className="grid gap-4">
            <ol className="grid list-decimal gap-2 pl-5 text-base">
              {m.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
            <h3 className="text-[0.6rem]">{m.hub.settingsTitle}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <SpeedToggle />
              <SoundToggle />
            </div>
          </Card>
        </Section>
      </div>
    );
  }

  const over = valid.phase === "won" || valid.phase === "lost";
  // During a run a one-line bar replaces the page header, leaving the screen to the game.
  const runBar = (
    <div className="text-muted -mt-2 mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h1 className="font-display text-foreground text-[0.65rem]">{gymOf(valid).name}</h1>
        <span>
          {valid.practice && `${m.practiceBadge} · `}
          {valid.daily
            ? `${m.dailyBadge} ${formatDailyDate(valid.daily)}`
            : `${m.modeBadge(m.modes[valid.mode].label)} · ${m.seed(valid.seed)}`}
          {valid.legendary && ` · ${m.hub.legendaryTitle}`}
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
          {valid.daily && !valid.practice && (
            <p className="mb-2 text-center text-sm">{m.abandonDaily}</p>
          )}
          {valid.legendary && <p className="mb-2 text-center text-sm">{m.abandonLegendary}</p>}
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
            if (currentDraft(valid, pool).legendary && !valid.practice) recordCatch(name);
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
