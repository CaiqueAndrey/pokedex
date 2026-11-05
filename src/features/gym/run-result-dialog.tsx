"use client";

import { History, RotateCcw, Trophy } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { messages } from "@/config/messages";
import { REWARD_ITEMS, type AchievementId } from "@/config/gym";
import { battlesWon, rewardFor } from "@/lib/battle/progress";
import { battleCount, gymOf, isGauntlet, trainerFor, type GymRun } from "@/lib/battle/run";
import { topDamage } from "@/lib/battle/stats";
import { formatName } from "@/lib/format";
import type { GameItem } from "@/types/item";
import { BallIcon } from "./ball-icon";
import { GymBadge } from "./gym-badge";
import { ItemIcon } from "./item-icon";
import { ShareButton } from "./share-button";

const m = messages.gym;

/** Jessie and James side by side: the art for beating (or losing to) Team Rocket. */
export function RocketDuo({ className }: { className?: string }) {
  return (
    <div className={className} role="img" aria-label={m.rocketAlt}>
      <div className="flex items-end justify-center gap-1">
        <Image src="/img/james.png" alt="" width={183} height={265} className="h-28 w-auto" />
        <Image src="/img/jessie.png" alt="" width={340} height={635} className="h-36 w-auto" />
      </div>
    </div>
  );
}

/** The one-line outcome of a finished run, for the dialog and the result card. */
export function resultLine(run: GymRun): string {
  const wins = battlesWon(run);
  if (run.phase === "won")
    return run.mode === "daily" ? m.resultRocket : m.resultWon(gymOf(run).name);
  return isGauntlet(run) ? m.resultGauntlet(wins) : m.resultLost(wins, battleCount(run));
}

/**
 * Shown over the battle screen as soon as the deciding battle ends (a defeat, or the win over the
 * leader): the outcome and the reward first, then the choice between the history and a new run.
 */
export function RunResultDialog({
  run,
  item,
  streak,
  unlocked,
  xp = 0,
  levelUp,
  streakBonus,
  onHistory,
  onNewRun,
}: {
  run: GymRun;
  /** The daily item won (cleared daily challenge only). */
  item?: GameItem;
  streak: number;
  unlocked: AchievementId[];
  xp?: number;
  levelUp?: number;
  streakBonus?: number;
  onHistory: () => void;
  onNewRun: () => void;
}) {
  const gym = gymOf(run);
  const won = run.phase === "won";
  const wins = battlesWon(run);
  const last = run.history.at(-1);
  const trainer = last ? trainerFor(run, last.battle) : "";
  const mvp = topDamage(won ? run.history.map((r) => r.damage) : last ? [last.damage] : []);
  const reward = run.practice ? undefined : rewardFor(run);

  return (
    <Dialog
      open
      title={won ? m.wonTitles[run.mode] : m.lostTitle}
      onClose={onHistory}
      testId="run-result-dialog"
    >
      <div className="grid justify-items-center gap-3 text-center">
        {won ? (
          <div className="flex items-center justify-center gap-3">
            <Image
              src={gym.trophyImage}
              alt={run.mode === "daily" ? m.rocketAlt : m.championAlt}
              width={1254}
              height={1254}
              className="size-32 rounded-2xl sm:size-40"
            />
            {gym.badgeImage && gym.badge && (
              <GymBadge src={gym.badgeImage} label={gym.badge} className="animate-float size-20" />
            )}
          </div>
        ) : isGauntlet(run) && wins > 0 ? (
          <RocketDuo className="motion-safe:animate-float" />
        ) : (
          <Image
            src="/img/game_over.png"
            alt={m.gameOverAlt}
            width={1536}
            height={1024}
            className="h-auto w-full max-w-xs rounded-2xl"
          />
        )}
        <p className="text-base">{resultLine(run)}</p>
        {xp > 0 && (
          <p
            className="font-display flex items-center gap-2 text-[0.65rem] text-amber-600 dark:text-amber-400"
            data-testid="xp-gained"
          >
            {m.xpGained(xp)}
            {levelUp && <span className="text-foreground">· {m.levelUp(levelUp)}</span>}
          </p>
        )}
        {!won && last && (
          <p className="text-muted text-sm">
            {last.opponentMvp
              ? m.defeatedBy(trainer, formatName(last.opponentMvp))
              : m.defeatedByTrainer(trainer)}
          </p>
        )}
        {run.practice && (
          <p className="text-muted text-sm" data-testid="practice-note">
            {m.practiceResult}
          </p>
        )}
        {reward && (
          <p
            className="font-display flex items-center gap-2 text-[0.6rem] leading-relaxed"
            data-testid="reward"
          >
            <BallIcon ball={reward} className="motion-safe:animate-pop size-10" />
            {m.ballWon(m.balls[reward])}
          </p>
        )}
        {item && (
          <p
            className="font-display flex items-center gap-2 text-[0.6rem] leading-relaxed"
            data-testid="reward-item"
          >
            <ItemIcon item={item} className="size-10" />
            {m.itemWon(REWARD_ITEMS[item.name as keyof typeof REWARD_ITEMS] ?? item.name)}
          </p>
        )}
        {streakBonus && (
          <p
            className="font-display flex items-center gap-2 text-[0.6rem] leading-relaxed"
            data-testid="streak-bonus"
          >
            <BallIcon ball="master" className="motion-safe:animate-pop size-10" />
            {m.streakBonus(streakBonus)}
          </p>
        )}
        {mvp && (
          <p className="font-display text-[0.6rem] leading-relaxed" data-testid="run-mvp">
            ⭐ {won ? m.mvpRun(formatName(mvp)) : m.mvp(formatName(mvp))}
          </p>
        )}
        {won && streak > 1 && <p className="text-sm font-bold">🔥 {m.streak(streak)}</p>}
        {unlocked.length > 0 && (
          <div className="border-border w-full rounded-2xl border-2 p-3" data-testid="unlocked">
            <p className="font-display mb-2 flex items-center justify-center gap-2 text-[0.6rem]">
              <Trophy aria-hidden className="size-4 text-amber-500" />
              {m.newAchievements}
            </p>
            <ul className="grid gap-1 text-sm">
              {unlocked.map((id) => (
                <li key={id}>
                  <strong>{m.achievements[id].label}</strong>: {m.achievements[id].description}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={onHistory}>
            <History aria-hidden className="size-4" />
            {m.viewHistory}
          </Button>
          <ShareButton
            result={{ mode: run.mode, battlesWon: wins, won, daily: run.daily, seed: run.seed }}
          />
          <Button onClick={onNewRun} autoFocus>
            <RotateCcw aria-hidden className="size-4" />
            {m.newRun}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
