"use client";

import { ArrowRight, CalendarDays, Check, Dumbbell, History, Sparkles, Swords } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import {
  DAILY_ARCHIVE_DAYS,
  GYMS,
  REWARD_ITEMS,
  ROCKET_PUZZLE,
  SELECTABLE_MODES,
  type GymMode,
} from "@/config/gym";
import { messages } from "@/config/messages";
import {
  dailyItem,
  dailyStreak,
  playsToStreakBonus,
  formatDailyDate,
  nextStep,
  pastDays,
  topBall,
  type GymStats,
  type HistoryEntry,
} from "@/lib/battle/progress";
import { rocketGrid } from "@/lib/battle/puzzle";
import type { StartOptions } from "@/lib/battle/run";
import { formatCountdown } from "@/lib/format";
import type { GameItem } from "@/types/item";
import { BallIcon } from "./ball-icon";
import { GymBadge } from "./gym-badge";
import { ItemIcon } from "./item-icon";
import { QuizHubCard } from "../quiz/quiz-hub-card";
import { HistoryCard } from "./gym-history";
import { RocketDuo } from "./run-result-dialog";
import { useRocketProgress } from "./use-gym";
import type { BattlePokemon } from "@/types/battle";

const m = messages.gym;
const h = m.hub;

export interface HubProps {
  /** Mode highlighted as the last one played. */
  lastMode: GymMode | undefined;
  stats: GymStats;
  badges: string[];
  /** Days with any daily game played (gym daily or quiz): the streak. */
  days: { date: string }[];
  today: string;
  secondsLeft: number;
  items: GameItem[];
  /** The last finished run, shown as a reminder with a link to the history. */
  lastRun?: HistoryEntry;
  pool: BattlePokemon[];
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
  const ball = topBall(mode);
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
        {ball && (
          <li className="flex items-center gap-1">
            <BallIcon ball={ball} className="size-7" />
            {m.balls[ball]}
          </li>
        )}
        {item && (
          <li className="flex items-center gap-1">
            <ItemIcon item={item} />
            {REWARD_ITEMS[item.name as keyof typeof REWARD_ITEMS] ?? item.name}
          </li>
        )}
      </ul>
      {mode === "daily" && <p className="text-muted text-xs">{h.dailyLadder}</p>}
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
        {gym.field && (
          <p className="text-sm" data-testid={`field-${mode}`}>
            <strong>{m.fields[mode].label}:</strong> {m.fields[mode].text}
          </p>
        )}
      </div>
      <Prize mode={mode} item={item} />
      <div className="text-sm">{status}</div>
      <div className="mt-auto flex flex-wrap gap-2">{children}</div>
    </article>
  );
}

/** One clear suggestion at the top of the hub: what to play now, and why. */
function NextStepCard({
  stats,
  badges,
  playedToday,
  onStart,
}: {
  stats: GymStats;
  badges: string[];
  playedToday: boolean;
  onStart: HubProps["onStart"];
}) {
  const step = nextStep({ stats, badges, playedToday });
  const copy =
    step.kind === "gym" ? h.next[step.reason === "again" ? "again" : step.mode] : h.next[step.kind];
  const router = useRouter();
  const start = () => {
    if (step.kind === "daily") router.push("/gym/emboscada");
    else if (step.kind === "legendary") onStart("easy", { legendary: true });
    else onStart(step.mode);
  };
  return (
    <section
      aria-labelledby="next-step-title"
      className="border-primary-600 bg-surface grid gap-3 rounded-3xl border-2 p-4 shadow-[4px_4px_0_0_var(--primary-700)]"
      data-testid="next-step"
    >
      <p className="bg-primary-600 text-on-primary font-display w-fit rounded-md px-1.5 py-0.5 text-[0.55rem]">
        {h.next.label}
      </p>
      <h2 id="next-step-title" className="text-[0.7rem] leading-relaxed sm:text-xs">
        {copy.title}
      </h2>
      <p className="text-base">{copy.text}</p>
      <Button onClick={start} className="w-full sm:w-fit">
        {copy.cta}
        <ArrowRight aria-hidden className="size-4" />
      </Button>
    </section>
  );
}

export function GymHub({
  lastMode,
  stats,
  badges,
  days,
  today,
  secondsLeft,
  items,
  lastRun,
  pool,
  onStart,
}: HubProps) {
  const [legendary, setLegendary] = useState(false);
  const masterBalls = stats.balls.master;
  const withLegendary = legendary && masterBalls > 0;
  const itemsByName = new Map(items.map((item) => [item.name, item]));
  const rocket = useRocketProgress();
  const todayRocket = rocket.days.find((entry) => entry.date === today);
  const playedToday = days.some((entry) => entry.date === today);
  const todayItem = today ? itemsByName.get(dailyItem(today)) : undefined;
  const archive = today ? pastDays(today, DAILY_ARCHIVE_DAYS) : [];
  const streak = today ? dailyStreak(days, today) : 0;

  return (
    <div className="grid gap-10">
      {/* Hero, in the spirit of 7a0: the full pitch on a first visit, the title afterwards. */}
      <header className="animate-fade-up grid gap-3">
        <h1 className="text-base sm:text-lg">{m.title}</h1>
        <p className="font-display text-primary-600 text-[0.7rem] leading-relaxed sm:text-xs">
          {h.tagline}
        </p>
        {stats.runs === 0 && (
          <>
            <p className="max-w-3xl text-base">{h.intro}</p>
            <ol className="grid grid-cols-3 gap-2 sm:gap-3">
              {h.steps.map((step, index) => (
                <li
                  key={step.title}
                  className="border-border bg-surface rounded-2xl border-2 p-2 sm:p-3"
                >
                  <p className="font-display text-[0.6rem]">
                    <span className="bg-primary-600 text-on-primary rounded-md px-1">
                      {String(index + 1).padStart(2, "0")}
                    </span>{" "}
                    {step.title}
                  </p>
                  <p className="text-muted mt-1 text-xs sm:text-sm">{step.text}</p>
                </li>
              ))}
            </ol>
          </>
        )}
      </header>

      {today && (
        <NextStepCard
          stats={stats}
          badges={badges}
          playedToday={Boolean(todayRocket)}
          onStart={onStart}
        />
      )}

      {lastRun && (
        <Section id="ultimo" title={h.lastRun}>
          <HistoryCard entry={lastRun} pool={pool} />
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/gym/historico" variant="secondary">
              <History aria-hidden className="size-4" />
              {h.seeHistory}
            </LinkButton>
            <LinkButton href="/gym/recompensas" variant="ghost">
              {h.seeRewards}
            </LinkButton>
          </div>
        </Section>
      )}

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
                <Button
                  className="w-full"
                  onClick={() => onStart(mode, { legendary: withLegendary })}
                >
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
                  {todayRocket?.result ? (
                    <p data-testid="daily-played">
                      {rocketGrid(todayRocket.attempts, ROCKET_PUZZLE.opponents).join(" ")}{" "}
                      {h.dailyPlayed(todayRocket.result === "won", todayRocket.attempts.length)}
                    </p>
                  ) : todayRocket ? (
                    <p data-testid="daily-played">
                      {h.dailyInProgress(ROCKET_PUZZLE.attempts - todayRocket.attempts.length)}
                    </p>
                  ) : null}
                  <p className="font-bold" data-testid="daily-streak">
                    {streak > 0 && `${h.streak(streak)} · `}
                    {h.streakHint(playsToStreakBonus(days, today), playedToday)}
                  </p>
                  <p className="text-muted">{h.dailyOnce}</p>
                  <p className="font-bold tabular-nums" data-testid="daily-countdown">
                    {h.nextDaily(formatCountdown(secondsLeft))}
                  </p>
                </div>
              ) : null
            }
          >
            {today &&
              (todayRocket?.result ? (
                <LinkButton href="/gym/emboscada" variant="secondary" className="w-full">
                  <Dumbbell aria-hidden className="size-4" />
                  {h.seeDaily}
                </LinkButton>
              ) : (
                <LinkButton href="/gym/emboscada" className="w-full">
                  <CalendarDays aria-hidden className="size-4" />
                  {todayRocket ? h.continueDaily : h.play.daily}
                </LinkButton>
              ))}
          </ModeCard>
        </div>

        {today && <QuizHubCard today={today} />}

        {/* The Master Ball's use: a legendary on your team (regular gyms only). */}
        <Card className="flex flex-wrap items-center gap-3" data-testid="legendary-option">
          <BallIcon ball="master" earned={masterBalls > 0} className="size-10" />
          <div className="grid min-w-48 flex-1 gap-1">
            <p className="font-display flex items-center gap-2 text-[0.6rem]">
              <Sparkles aria-hidden className="size-4 text-amber-500" />
              {h.legendaryTitle}
            </p>
            {masterBalls > 0 ? (
              <p className="text-muted text-sm">{h.legendaryHelp}</p>
            ) : (
              <div className="grid gap-1 text-sm" data-testid="legendary-paths">
                <p className="text-muted">{h.legendaryLocked}</p>
                <ul className="grid gap-1">
                  <li className="flex items-start gap-2">
                    <BallIcon ball="master" earned={false} className="size-5 shrink-0" />
                    <span>{h.legendaryPaths.hard(stats.cleared.hard)}</span>
                  </li>
                  {today && (
                    <li className="flex items-start gap-2">
                      <BallIcon ball="master" earned={false} className="size-5 shrink-0" />
                      <span>
                        {h.legendaryPaths.streak(playsToStreakBonus(days, today), playedToday)}
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            )}
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
                const result = rocket.days.find((entry) => entry.date === day)?.result;
                return (
                  <li
                    key={day}
                    className="border-border flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 p-2"
                  >
                    <span className="font-display text-[0.6rem]">{formatDailyDate(day)}</span>
                    <span className="text-sm">
                      {result ? h.archiveResult(result === "won") : h.archiveNotPlayed}
                    </span>
                    <LinkButton href={`/gym/emboscada?dia=${day}`} variant="ghost">
                      <Dumbbell aria-hidden className="size-4" />
                      {h.archivePractice(formatDailyDate(day))}
                    </LinkButton>
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
