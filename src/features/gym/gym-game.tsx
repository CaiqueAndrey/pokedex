"use client";

import { RotateCcw, Swords } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ActionBar } from "@/components/ui/action-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { messages } from "@/config/messages";
import { GYMS, RULES_VERSION, type AchievementId, type GymMode } from "@/config/gym";
import {
  battlesWon,
  dailyItem,
  dailySeed,
  earnsDailyItem,
  formatDailyDate,
  levelFor,
  rewardFor,
  totalXp,
  xpForRun,
} from "@/lib/battle/progress";
import {
  addBonusReroll,
  applyResult,
  battleConfig,
  battleCount,
  battleFor,
  byName,
  chooseReplacementPick,
  chooseReward,
  countersLead,
  currentDraft,
  evolveMember,
  gymOf,
  opponentFor,
  opponentRevealed,
  pickPokemon,
  playerTeam,
  reorder,
  reroll,
  rewardItem,
  startBattle,
  startRun,
  trainerFor,
  type GymRun,
  type StartOptions,
} from "@/lib/battle/run";
import { encounterOffers } from "@/lib/battle/draft";
import { newSeed, rngFrom } from "@/lib/battle/rng";
import { formatName } from "@/lib/format";
import type { BattlePokemon, BattleResult } from "@/types/battle";
import type { GameItem } from "@/types/item";
import type { TypeRelations } from "@/types/pokemon";
import { BattleView } from "./battle-view";
import { BallIcon } from "./ball-icon";
import { DraftBoard } from "./draft-board";
import { GymBadge } from "./gym-badge";
import { GymPokemon } from "./gym-pokemon";
import { GymHub } from "./gym-hub";
import { PreBattle } from "./pre-battle";
import { BagButton, RewardPicker } from "./run-extras";
import { RunPath } from "./run-path";
import { resultLine, RunResultDialog } from "./run-result-dialog";
import { ShareButton } from "./share-button";
import { SoundToggle } from "./sound-toggle";
import { SpeedToggle } from "./speed-toggle";
import {
  recordAbandonedDaily,
  recordCatch,
  recordFinishedRun,
  addItem,
  setGymFocus,
  sfx,
  spendItem,
  takeMasterBall,
  useBadges,
  useGymHistory,
  useGymProgress,
  useGymRun,
  useToday,
  useTrainer,
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
  /** XP the run gave (end of run only) and the new level, when it went up. */
  xp: number;
  levelUp?: number;
  /** Daily streak that just earned a Master Ball. */
  streakBonus?: number;
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
  const { stats, days, bag } = useGymProgress();
  const { trainer } = useTrainer();
  const history = useGymHistory();
  const { today, secondsLeft } = useToday();
  const playerName = trainer?.name ?? m.trainer.anonymous;
  const [battle, setBattle] = useState<ActiveBattle | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  /** Lines to celebrate after a catch (the legendary, groups completed). */
  const [notice, setNotice] = useState<string[]>([]);
  const names = useMemo(() => byName(pool), [pool]);

  // A saved run that no longer matches the pool (e.g. after a data update) or that was started
  // under older rules (its opponents would change mid-run) is discarded.
  const outdated = run !== null && run.rules !== RULES_VERSION;
  const valid = run && !outdated && run.picks.every((name) => names.has(name)) ? run : null;
  const team = valid ? playerTeam(valid, pool) : [];
  // While drafting, ordering or battling, the gym's tabs step aside (see GymTabs).
  const focus = Boolean(battle) || valid?.phase === "draft" || valid?.phase === "ready";
  useEffect(() => {
    setGymFocus(focus);
    return () => setGymFocus(false);
  }, [focus]);
  const itemFor = (run: GymRun) => {
    if (!earnsDailyItem(run) || !run.daily) return undefined;
    const name = dailyItem(run.daily);
    return items.find((item) => item.name === name);
  };

  /**
   * Starts a run from the hub. A legendary encounter spends a Master Ball up front and fixes its
   * three offers (uncaught ones first); a caught legendary can be called in for free.
   */
  function start(mode: GymMode, options: StartOptions = {}) {
    const legendary = Boolean(options.legendary) && mode !== "daily" && takeMasterBall();
    const summon =
      options.summon && !legendary && stats.caught.includes(options.summon)
        ? options.summon
        : undefined;
    sfx("roll");
    const runSeed = options.daily ? dailySeed(options.daily) : (seed ?? newSeed());
    const encounter = legendary
      ? encounterOffers(pool, stats.caught, rngFrom(runSeed, "encounter"), GYMS[mode].rules.player)
      : undefined;
    setNotice([]);
    setRun(
      startRun(runSeed, mode, {
        ...options,
        legendary,
        ...(encounter ? { encounter } : {}),
        ...(summon ? { summon } : {}),
      }),
    );
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

  /**
   * Starts the battle. It is saved as "in progress" (with your replacement picks as you make them),
   * so a reload resumes the same battle instead of letting you re-plan after seeing it.
   */
  function fight(current: GymRun) {
    sfx("send");
    setRun(startBattle(current));
    window.scrollTo({ top: 0 });
  }

  /** The battle has played out with your picks: apply it, record the run's end, show the ending. */
  function finish(current: GymRun) {
    const result = battleFor(current, pool, relations);
    const next = applyResult(current, result, pool, relations);
    setRun(next);
    const over = next.phase === "won" || next.phase === "lost";
    const badgeId = gymOf(next).badgeId;
    if (next.phase === "won" && badgeId && !next.practice) addBadge(badgeId);
    const before = levelFor(totalXp(stats));
    const { unlocked, streakBonus } = over ? recordFinishedRun(next, pool) : { unlocked: [] };
    const xp = over ? xpForRun(next) : 0;
    const after = levelFor(before.xp + xp);
    setBattle({
      result,
      team: playerTeam(current, pool),
      opponent: opponentFor(current, current.battle, pool, relations),
      trainer: trainerFor(current, current.battle),
      next,
      unlocked,
      xp,
      ...(after.level > before.level ? { levelUp: after.level } : {}),
      ...(streakBonus ? { streakBonus } : {}),
    });
  }

  // A battle in progress: it plays, pausing for your replacement picks, then `finish` applies it.
  if (!battle && valid?.phase === "ready" && valid.battling) {
    const live = valid;
    const result = battleFor(live, pool, relations);
    return (
      <BattleView
        key={`${live.seed}-${live.battle}-live`}
        result={result}
        team={playerTeam(live, pool)}
        opponent={opponentFor(live, live.battle, pool, relations)}
        trainer={trainerFor(live, live.battle)}
        playerName={playerName}
        heading={`${gymOf(live).name} · ${m.battleOf(live.battle + 1, battleCount(live))}`}
        trainerImage={battleConfig(live, live.battle)?.image}
        doneLabel={m.next}
        badge={live.battle === battleCount(live) - 1 && result.winner === "player"}
        relations={relations}
        choicesMade={live.battling?.choices.length ?? 0}
        onChoose={(index) => {
          sfx("send");
          setRun(chooseReplacementPick(live, index));
        }}
        onEnd={() => finish(live)}
        onDone={() => undefined}
      />
    );
  }

  if (battle) {
    const over = battle.next.phase !== "ready";
    const nextTrainer = trainerFor(battle.next, battle.next.battle);
    const index = battle.next.history.length - 1;
    return (
      <BattleView
        key={`${battle.next.seed}-${battle.next.battle}-${battle.next.phase}-done`}
        startAtEnd
        result={battle.result}
        team={battle.team}
        opponent={battle.opponent}
        trainer={battle.trainer}
        playerName={playerName}
        heading={`${gymOf(battle.next).name} · ${m.battleOf(index + 1, battleCount(battle.next))}`}
        trainerImage={battleConfig(battle.next, index)?.image}
        doneLabel={m.next}
        doneHint={over ? undefined : m.wonNext(nextTrainer)}
        badge={battle.next.phase === "won"}
        onDone={() => {
          setBattle(null);
          window.scrollTo({ top: 0 });
        }}
      >
        {over ? (
          <RunResultDialog
            run={battle.next}
            item={itemFor(battle.next)}
            streak={stats.streak}
            unlocked={battle.unlocked}
            xp={battle.xp}
            levelUp={battle.levelUp}
            streakBonus={battle.streakBonus}
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
          days={days}
          today={today}
          secondsLeft={secondsLeft}
          items={items}
          lastRun={history[0]}
          pool={pool}
          onStart={start}
        />
        <section
          aria-label={m.hub.settingsTitle}
          className="mb-16 flex flex-wrap items-center justify-end gap-2"
        >
          <span className="font-display text-[0.6rem]">{m.hub.settingsTitle}</span>
          <SpeedToggle />
          <SoundToggle />
        </section>
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
          {valid.summon && ` · ${m.legends.summoned}`}
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
        {notice.length > 0 && (
          <div
            className="mb-4 grid gap-1 rounded-2xl border-2 border-amber-500 bg-amber-500/10 p-3 text-sm font-bold"
            role="status"
            data-testid="catch-notice"
          >
            {notice.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}
        <DraftBoard
          run={valid}
          pool={pool}
          team={team}
          relations={relations}
          onPick={(name) => {
            sfx("pick");
            if (currentDraft(valid, pool).legendary && !valid.practice) {
              const completed = recordCatch(name);
              setNotice([
                m.legends.caughtNow(formatName(name)),
                ...completed.map((set) => m.legends.setDone(m.legends.setNames[set])),
              ]);
            }
            setRun(pickPokemon(valid, name, pool));
          }}
          onReroll={() => {
            sfx("roll");
            setRun(reroll(valid));
          }}
          bag={valid.practice ? {} : bag}
          onBuyReroll={(item) => {
            if (!spendItem(item)) return;
            sfx("roll");
            setRun(reroll(addBonusReroll(valid)));
          }}
        />
      </>
    );
  }

  if (valid.phase === "ready") {
    return (
      <>
        {runBar}
        {valid.reward && (
          <div className="mb-5">
            <RewardPicker
              run={valid}
              team={team}
              pool={pool}
              items={items}
              onChoose={(kind, target) => {
                sfx("pick");
                if (kind === "item" && !valid.practice) addItem(rewardItem(valid, valid.battle));
                setRun(chooseReward(valid, kind, pool, target));
              }}
            />
          </div>
        )}
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <PreBattle
            revealed={opponentRevealed(valid)}
            boosts={valid.boosts}
            battle={valid.battle}
            mode={valid.mode}
            trainer={trainerFor(valid, valid.battle)}
            team={team}
            opponent={opponentFor(valid, valid.battle, pool, relations)}
            relations={relations}
            counters={gymOf(valid).rules.reveal && countersLead(valid, valid.battle)}
            onReorder={(order) => setRun(reorder(valid, order))}
          />
          <RunPath run={valid} pool={pool} />
        </div>
        <ActionBar
          hint={
            valid.reward ? (
              <p className="font-bold">{m.rewards.pending}</p>
            ) : (
              team[0] && <p data-testid="lead-hint">{m.leadHint(formatName(team[0].name))}</p>
            )
          }
        >
          <BagButton
            run={valid}
            team={team}
            pool={pool}
            bag={bag}
            items={items}
            onUse={(item, member) => {
              if (!spendItem(item)) return;
              sfx("pick");
              setRun(evolveMember(valid, member, item, pool));
            }}
          />
          <Button onClick={() => fight(valid)} disabled={Boolean(valid.reward)}>
            <Swords aria-hidden className="size-4" />
            {m.fight}
          </Button>
        </ActionBar>
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
            <p className="text-base">{resultLine(valid)}</p>
            {reward && (
              <p className="flex items-center gap-2 text-sm">
                <BallIcon ball={reward} />
                {m.ballWon(m.balls[reward])}
              </p>
            )}
          </div>
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
      <ActionBar className="mt-4">
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
      </ActionBar>
    </>
  );
}
