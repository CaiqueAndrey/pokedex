"use client";

import { CalendarDays, Check, Dumbbell, Sparkles, Swords } from "lucide-react";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import {
  BALL_FOR_CLEAR,
  DAILY_ARCHIVE_DAYS,
  GYMS,
  REWARD_ITEMS,
  SELECTABLE_MODES,
  type GymMode,
} from "@/config/gym";
import { messages } from "@/config/messages";
import {
  dailyItem,
  formatDailyDate,
  pastDays,
  resultGrid,
  type DailyResult,
  type GymStats,
} from "@/lib/battle/progress";
import type { StartOptions } from "@/lib/battle/run";
import { formatCountdown } from "@/lib/format";
import type { GameItem } from "@/types/item";
import { BallIcon } from "./ball-icon";
import { GymBadge } from "./gym-badge";
import { ItemIcon } from "./item-icon";
import { RocketDuo } from "./run-result-dialog";

const m = messages.gym;
const h = m.hub;

export interface HubProps {
  /** Mode highlighted as the last one played. */
  lastMode: GymMode | undefined;
  stats: GymStats;
  badges: string[];
  daily: DailyResult[];
  today: string;
  secondsLeft: number;
  items: GameItem[];
  onStart: (mode: GymMode, options?: StartOptions) => void;
}

export function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="grid scroll-mt-24 gap-4">
      <div className="grid gap-1">
        <h2 id={`${id}-title`} className="text-xs sm:text-sm">
          {title}
        </h2>
        {description && <p className="text-muted text-base">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** "Você ganha": the rewards a mode gives, with their art. */
function Prize({ mode, item }: { mode: GymMode; item?: GameItem }) {
  const gym = GYMS[mode];
  const ball = BALL_FOR_CLEAR[mode];
  return (
    <div className="grid gap-1">
      <p className="text-muted text-xs">{h.youWin}</p>
      <ul
        className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
        data-testid={`prize-${mode}`}
      >
        {gym.badge && gym.badgeImage && (
          <li className="flex items-center gap-1">
            <GymBadge src={gym.badgeImage} label="" className="size-7" />
            {gym.badge}
          </li>
        )}
        <li className="flex items-center gap-1">
          <BallIcon ball={ball} className="size-7" />
          {m.balls[ball]}
        </li>
        {item && (
          <li className="flex items-center gap-1">
            <ItemIcon item={item} />
            {REWARD_ITEMS[item.name as keyof typeof REWARD_ITEMS] ?? item.name}
          </li>
        )}
      </ul>
    </div>
  );
}

function ModeCard({
  mode,
  art,
  highlight,
  status,
  children,
  item,
  artClassName = "w-20",
}: {
  mode: GymMode;
  art: ReactNode;
  highlight?: boolean;
  status: ReactNode;
  children: ReactNode;
  item?: GameItem;
  /** Width of the art box (the Rocket duo needs more room than one leader). */
  artClassName?: string;
}) {
  const gym = GYMS[mode];
  return (
    <article
      className={cn(
        "border-border bg-surface relative grid content-start gap-3 rounded-3xl border-2 p-4 shadow-[4px_4px_0_0_var(--border)]",
        highlight && "border-primary-600",
      )}
      data-testid={`mode-card-${mode}`}
    >
      {highlight && (
        <span className="bg-primary-600 text-on-primary absolute -top-3 right-4 rounded-full px-2 py-0.5 text-xs font-bold">
          {h.lastPlayed}
        </span>
      )}
      <div className="flex items-end gap-3">
        <div className={cn("relative h-28 shrink-0", artClassName)}>{art}</div>
        <div className="grid gap-1 pb-1">
          <span className="font-display bg-primary-600 text-on-primary w-fit rounded-md px-1.5 py-0.5 text-[0.55rem]">
            {m.modes[mode].label}
          </span>
          <h3 className="text-[0.7rem] leading-relaxed">{gym.name}</h3>
          <p className="text-muted text-xs">
            {mode === "daily" ? h.bosses : `${m.leader}: ${gym.leader}`}
          </p>
        </div>
      </div>
      <div className="grid gap-1">
        <p className="text-muted text-xs">{h.youFace}</p>
        <p className="text-sm">{h.face[mode]}</p>
      </div>
      <Prize mode={mode} item={item} />
      <div className="text-sm">{status}</div>
      <div className="mt-auto flex flex-wrap gap-2">{children}</div>
    </article>
  );
}

export function GymHub({
  lastMode,
  stats,
  badges,
  daily,
  today,
  secondsLeft,
  items,
  onStart,
}: HubProps) {
  const [legendary, setLegendary] = useState(false);
  const masterBalls = stats.balls.master;
  const withLegendary = legendary && masterBalls > 0;
  const itemsByName = new Map(items.map((item) => [item.name, item]));
  const todayResult = daily.find((entry) => entry.date === today);
  const todayItem = today ? itemsByName.get(dailyItem(today)) : undefined;
  const archive = today ? pastDays(today, DAILY_ARCHIVE_DAYS) : [];

  return (
    <div className="grid gap-10">
      {/* Hero, in the spirit of 7a0: the pitch, three steps, and where to go next. */}
      <header className="animate-fade-up grid gap-4">
        <h1 className="text-base sm:text-lg">{m.title}</h1>
        <p className="font-display text-primary-600 text-[0.7rem] leading-relaxed sm:text-xs">
          {h.tagline}
        </p>
        <p className="max-w-3xl text-base">{h.intro}</p>
        <ol className="grid gap-3 sm:grid-cols-3">
          {h.steps.map((step, index) => (
            <li key={step.title} className="border-border bg-surface rounded-2xl border-2 p-3">
              <p className="font-display text-[0.6rem]">
                <span className="bg-primary-600 text-on-primary rounded-md px-1">
                  {String(index + 1).padStart(2, "0")}
                </span>{" "}
                {step.title}
              </p>
              <p className="text-muted mt-1 text-sm">{step.text}</p>
            </li>
          ))}
        </ol>
        <nav aria-label={h.navLabel} className="flex flex-wrap gap-2 text-sm">
          {(["play", "rewards", "rules"] as const).map((key) => (
            <a
              key={key}
              href={`#${key === "play" ? "desafios" : key === "rewards" ? "recompensas" : "regras"}`}
              className="border-border hover:bg-border/60 rounded-full border-2 px-3 py-1"
            >
              {h.nav[key]}
            </a>
          ))}
        </nav>
      </header>

      <Section id="desafios" title={h.playTitle} description={h.playDescription}>
        <div className="grid gap-5 lg:grid-cols-3">
          {SELECTABLE_MODES.map((mode) => {
            const gym = GYMS[mode];
            const earned = gym.badgeId ? badges.includes(gym.badgeId) : false;
            return (
              <ModeCard
                key={mode}
                mode={mode}
                highlight={lastMode === mode}
                art={
                  <Image
                    src={gym.leaderImage}
                    alt={gym.leader}
                    fill
                    sizes="80px"
                    className="object-contain object-bottom"
                  />
                }
                status={
                  <p className={cn("flex items-center gap-1", !earned && "text-muted")}>
                    {earned && <Check aria-hidden className="size-4 text-green-600" />}
                    {earned ? h.badgeEarned : h.badgeMissing}
                    {stats.cleared[mode] > 0 && ` · ${h.clears(stats.cleared[mode])}`}
                  </p>
                }
              >
                <Button onClick={() => onStart(mode, { legendary: withLegendary })}>
                  <Swords aria-hidden className="size-4" />
                  {h.play[mode]}
                </Button>
              </ModeCard>
            );
          })}

          <ModeCard
            mode="daily"
            item={todayItem}
            artClassName="w-28"
            art={
              <RocketDuo className="absolute inset-0 flex items-end [&_img]:!h-24 [&_img:last-child]:!h-28" />
            }
            status={
              today ? (
                <div className="grid gap-1" data-testid="daily">
                  <p className="font-display text-[0.6rem]">{h.today(formatDailyDate(today))}</p>
                  {todayResult ? (
                    <p data-testid="daily-played">
                      {resultGrid(todayResult.battlesWon, todayResult.won)}{" "}
                      {h.dailyPlayed(todayResult.battlesWon)}
                    </p>
                  ) : null}
                  <p className="text-muted">{h.dailyOnce}</p>
                  <p className="font-bold tabular-nums" data-testid="daily-countdown">
                    {h.nextDaily(formatCountdown(secondsLeft))}
                  </p>
                </div>
              ) : null
            }
          >
            {today &&
              (todayResult ? (
                <Button
                  variant="secondary"
                  onClick={() => onStart("daily", { daily: today, practice: true })}
                >
                  <Dumbbell aria-hidden className="size-4" />
                  {h.practice}
                </Button>
              ) : (
                <Button onClick={() => onStart("daily", { daily: today })}>
                  <CalendarDays aria-hidden className="size-4" />
                  {h.play.daily}
                </Button>
              ))}
          </ModeCard>
        </div>

        {/* The Master Ball's use: a legendary on your team (regular gyms only). */}
        <Card className="flex flex-wrap items-center gap-3" data-testid="legendary-option">
          <BallIcon ball="master" earned={masterBalls > 0} className="size-10" />
          <div className="grid min-w-48 flex-1 gap-1">
            <p className="font-display flex items-center gap-2 text-[0.6rem]">
              <Sparkles aria-hidden className="size-4 text-amber-500" />
              {h.legendaryTitle}
            </p>
            <p className="text-muted text-sm">
              {masterBalls > 0 ? h.legendaryHelp : h.legendaryLocked}
            </p>
          </div>
          {masterBalls > 0 && (
            <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                className="accent-primary-600 size-5"
                checked={legendary}
                onChange={(event) => setLegendary(event.target.checked)}
              />
              {h.legendaryToggle(masterBalls)}
            </label>
          )}
        </Card>

        {archive.length > 0 && (
          <details
            className="border-border bg-surface rounded-2xl border-2 p-4"
            data-testid="archive"
          >
            <summary className="font-display cursor-pointer text-[0.6rem]">
              {h.archiveTitle}
            </summary>
            <p className="text-muted mt-2 text-sm">{h.archiveHint}</p>
            <ul className="mt-3 grid gap-2">
              {archive.map((day) => {
                const result = daily.find((entry) => entry.date === day);
                return (
                  <li
                    key={day}
                    className="border-border flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 p-2"
                  >
                    <span className="font-display text-[0.6rem]">{formatDailyDate(day)}</span>
                    <span className="text-sm">
                      {result
                        ? `${resultGrid(result.battlesWon, result.won)} ${result.battlesWon}/5`
                        : h.archiveNotPlayed}
                    </span>
                    <Button
                      variant="ghost"
                      onClick={() => onStart("daily", { daily: day, practice: true })}
                    >
                      <Dumbbell aria-hidden className="size-4" />
                      {h.archivePractice(formatDailyDate(day))}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </details>
        )}
      </Section>
    </div>
  );
}
