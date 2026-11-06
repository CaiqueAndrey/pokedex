"use client";

import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Dumbbell,
  History,
  Info,
  Swords,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { InfoTip } from "@/components/ui/info-tip";
import { ModalButton } from "@/components/ui/modal-button";
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
  resultGrid,
  battlesWon,
  topBall,
  type GymStats,
  type HistoryEntry,
} from "@/lib/battle/progress";
import { rocketGrid } from "@/lib/battle/puzzle";
import { battleCount, gymOf, type StartOptions } from "@/lib/battle/run";
import { formatCountdown } from "@/lib/format";
import type { GameItem } from "@/types/item";
import { BallIcon } from "./ball-icon";
import { GymBadge } from "./gym-badge";
import { ItemIcon } from "./item-icon";
import { QuizHubCard } from "../quiz/quiz-hub-card";
import { MissionsCard } from "./missions-card";
import { LegendsPanel, type LegendChoice } from "./legends-panel";
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
    </div>
  );
}

/** What a challenge is, in full: who you face, the field, the reward ladder and the rules. */
function ModeDetails({ mode, extra }: { mode: GymMode; extra?: ReactNode }) {
  const gym = GYMS[mode];
  return (
    <>
      <p>
        <strong>{h.youFace}:</strong> {h.face[mode]}
      </p>
      {gym.field && (
        <p data-testid={`field-${mode}`}>
          <strong>{m.fields[mode].label}:</strong> {m.fields[mode].text}
        </p>
      )}
      <p className="text-sm">{mode === "daily" ? h.dailyLadder : m.modes[mode].description}</p>
      {extra}
    </>
  );
}

function ModeCard({
  mode,
  art,
  highlight,
  status,
  children,
  item,
  details,
  artClassName = "w-20",
}: {
  mode: GymMode;
  art: ReactNode;
  highlight?: boolean;
  status: ReactNode;
  children: ReactNode;
  item?: GameItem;
  /** Extra lines for the details dialog. */
  details?: ReactNode;
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
        <div className={cn("relative h-24 shrink-0", artClassName)}>{art}</div>
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
      <Prize mode={mode} item={item} />
      <div className="text-sm">{status}</div>
      <div className="mt-auto grid gap-1">
        {children}
        <ModalButton
          label={h.details}
          title={gym.name}
          icon={<Info aria-hidden className="size-4" />}
          className="w-full"
          testId={`details-${mode}`}
        >
          <ModeDetails mode={mode} extra={details} />
        </ModalButton>
      </div>
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

/** The last finished run in one line, with the way to the full history. */
function LastRunLine({ entry }: { entry: HistoryEntry }) {
  const { run } = entry;
  const wins = battlesWon(run);
  const total = battleCount(run);
  return (
    <p
      className="border-border bg-surface flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border-2 p-3 text-sm"
      data-testid="history-entry"
    >
      <span className="font-display text-[0.6rem]">{h.lastRun}:</span>
      <span>{gymOf(run).name}</span>
      <span>
        {resultGrid(wins, run.phase === "won", total)} {m.shareScore(wins, total)}
      </span>
      <LinkButton href="/gym/historico" variant="ghost" className="ml-auto">
        <History aria-hidden className="size-4" />
        {h.seeHistory}
      </LinkButton>
    </p>
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
  const [legend, setLegend] = useState<LegendChoice>("none");
  const masterBalls = stats.balls.master;
  // A choice that no longer applies (the ball was spent, the legendary is gone) falls back to none.
  const choice: LegendChoice =
    legend === "encounter"
      ? masterBalls > 0
        ? legend
        : "none"
      : legend === "none" || stats.caught.includes(legend)
        ? legend
        : "none";
  const legendOptions: StartOptions =
    choice === "encounter" ? { legendary: true } : choice === "none" ? {} : { summon: choice };
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-base sm:text-lg">{m.title}</h1>
          <ModalButton
            label={h.rulesButton}
            title={m.rulesTitle}
            icon={<BookOpen aria-hidden className="size-4" />}
            variant="secondary"
            testId="rules"
          >
            <ol className="grid list-decimal gap-2 pl-5 text-base">
              {m.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
          </ModalButton>
        </div>
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
      {today && <MissionsCard today={today} compact />}

      {lastRun && <LastRunLine entry={lastRun} />}

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
                <Button className="w-full" onClick={() => onStart(mode, legendOptions)}>
                  <Swords aria-hidden className="size-4" />
                  {h.play[mode]}
                </Button>
              </ModeCard>
            );
          })}

          <ModeCard
            mode="daily"
            item={todayItem}
            details={<p className="text-sm">{h.dailyOnce}</p>}
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
                  <p className="flex items-center gap-1 font-bold" data-testid="daily-streak">
                    {streak > 0 ? h.streak(streak) : h.streakTip}
                    <InfoTip label={h.streakTip}>
                      {h.streakHint(playsToStreakBonus(days, today), playedToday)}
                    </InfoTip>
                  </p>
                  <p className="text-muted tabular-nums" data-testid="daily-countdown">
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

        <LegendsPanel
          stats={stats}
          pool={pool}
          days={days}
          today={today}
          playedToday={playedToday}
          choice={choice}
          onChoose={setLegend}
        />

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
