"use client";

import { Lock, Trophy } from "lucide-react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import {
  ACHIEVEMENTS,
  BALLS,
  GYMS,
  REWARD_ITEM_NAMES,
  REWARD_ITEMS,
  SECRET_ACHIEVEMENTS,
  SELECTABLE_MODES,
} from "@/config/gym";
import { messages } from "@/config/messages";
import {
  achievementProgress,
  badgeCount,
  favoritePick,
  type Bag,
  type GymStats,
} from "@/lib/battle/progress";
import { formatName } from "@/lib/format";
import { spriteUrl } from "@/lib/sprites";
import type { BattlePokemon } from "@/types/battle";
import type { GameItem } from "@/types/item";
import { BallIcon } from "./ball-icon";
import { GymBadge } from "./gym-badge";
import { Section } from "./gym-hub";
import { ItemIcon } from "./item-icon";
import { MissionsCard } from "./missions-card";
import { useBadges, useGymProgress, useToday } from "./use-gym";

const m = messages.gym;
const h = m.hub;

function RewardCard({
  title,
  hint,
  children,
  testId,
  className,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  testId?: string;
  className?: string;
}) {
  return (
    <Card className={cn("grid content-start gap-3", className)} data-testid={testId}>
      <div className="grid gap-1">
        <h3 className="text-[0.65rem]">{title}</h3>
        {hint && <p className="text-muted text-sm">{hint}</p>}
      </div>
      {children}
    </Card>
  );
}

/**
 * Everything the game gives, in one place: what each reward is, how to earn it and what you have.
 * Badges and balls are curated; the bag's items and the legendaries come from the PokeAPI.
 */
export function GymRewards({
  stats,
  badges,
  achievements,
  bag,
  items,
  legendaries,
}: {
  stats: GymStats;
  badges: string[];
  achievements: string[];
  bag: Bag;
  items: GameItem[];
  legendaries: BattlePokemon[];
}) {
  const itemsByName = new Map(items.map((item) => [item.name, item]));
  // Only ids that still exist count (achievements may be renamed between versions).
  const known = new Set<string>(ACHIEVEMENTS);
  const unlocked = new Set(achievements.filter((id) => known.has(id)));
  const favorite = favoritePick(stats);
  const caught = new Set(stats.caught);
  const statRows: [string, string | number][] = [
    [m.stats.runs, stats.runs],
    [m.stats.badges, badgeCount(stats)],
    [m.stats.rocket, stats.cleared.daily],
    [m.stats.battlesWon, stats.battlesWon],
    [m.stats.best, m.bestOf(stats.best)],
    [m.stats.dailyBest, m.bestOf(stats.dailyBest, GYMS.daily.battles.length)],
    [m.stats.streak, stats.streak],
    [m.stats.bestStreak, stats.bestStreak],
  ];

  return (
    <Section id="recompensas" title={h.rewardsTitle} description={h.rewardsDescription}>
      <div className="grid gap-5 md:grid-cols-2">
        <RewardCard title={m.badges} hint={h.badgesHint} testId="badges">
          <ul className="flex flex-wrap gap-6">
            {SELECTABLE_MODES.map((mode) => {
              const gym = GYMS[mode];
              if (!gym.badgeId || !gym.badge || !gym.badgeImage) return null;
              const earned = badges.includes(gym.badgeId);
              return (
                <li key={mode} className="grid justify-items-center gap-1 text-center">
                  <GymBadge
                    src={gym.badgeImage}
                    label={gym.badge}
                    earned={earned}
                    className="size-16"
                  />
                  <span className={cn("text-sm", !earned && "text-muted")}>{gym.badge}</span>
                  <span className="text-muted text-xs">
                    {gym.leader} · {m.modes[mode].label}
                  </span>
                </li>
              );
            })}
          </ul>
        </RewardCard>

        <RewardCard title={m.ballsTitle} hint={m.ballsHintModes}>
          <ul className="grid grid-cols-4 gap-2" data-testid="balls">
            {BALLS.map((ball) => (
              <li
                key={ball}
                className="border-border flex flex-col items-center gap-1 rounded-xl border-2 p-2 text-center"
              >
                <BallIcon ball={ball} earned={stats.balls[ball] > 0} className="size-10" />
                <span className="text-xs">{m.balls[ball]}</span>
                <span className="font-display text-xs">{stats.balls[ball]}</span>
              </li>
            ))}
          </ul>
        </RewardCard>

        <RewardCard title={h.bagTitle} hint={h.bagHint} testId="bag">
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {REWARD_ITEM_NAMES.map((name) => {
              const item = itemsByName.get(name);
              const owned = bag[name] ?? 0;
              return (
                <li
                  key={name}
                  className="border-border flex flex-col items-center gap-1 rounded-xl border-2 p-1 text-center"
                  title={REWARD_ITEMS[name]}
                >
                  {item ? (
                    <ItemIcon item={item} earned={owned > 0} className="size-8" />
                  ) : (
                    <span className="size-8" aria-hidden />
                  )}
                  <span className={cn("text-[0.65rem] leading-tight", owned === 0 && "text-muted")}>
                    {REWARD_ITEMS[name]}
                  </span>
                  <span className="font-display text-[0.6rem]">{owned}</span>
                </li>
              );
            })}
          </ul>
        </RewardCard>

        <RewardCard
          title={h.legendsTitle}
          hint={h.legendsHint(caught.size, legendaries.length)}
          testId="legends"
        >
          <ul className="grid grid-cols-6 gap-1 sm:grid-cols-9">
            {legendaries.map((pokemon) => {
              const has = caught.has(pokemon.name);
              return (
                <li key={pokemon.name} title={has ? formatName(pokemon.name) : "???"}>
                  <Image
                    src={spriteUrl(pokemon.id, "default")}
                    alt={has ? formatName(pokemon.name) : `${m.legendaryTag} ???`}
                    width={48}
                    height={48}
                    unoptimized
                    // A mid-gray silhouette reads on both light and dark surfaces.
                    className={cn(
                      "size-12",
                      !has && "opacity-50 [filter:brightness(0)_invert(0.55)]",
                    )}
                  />
                </li>
              );
            })}
          </ul>
        </RewardCard>

        <RewardCard
          title={m.achievementsTitle}
          hint={m.achievementCount(unlocked.size, ACHIEVEMENTS.length)}
          testId="achievements"
        >
          <ul className="grid gap-2">
            {ACHIEVEMENTS.map((id) => {
              const done = unlocked.has(id);
              const Icon = done ? Trophy : Lock;
              const secret = !done && SECRET_ACHIEVEMENTS.includes(id);
              const progress = done ? undefined : achievementProgress(id, stats, badges);
              return (
                <li
                  key={id}
                  className={cn("flex items-start gap-2 text-sm", !done && "text-muted")}
                  data-testid={done ? "achievement-unlocked" : "achievement-locked"}
                >
                  <Icon
                    aria-hidden
                    className={cn("mt-0.5 size-4 shrink-0", done && "text-amber-500")}
                  />
                  <span>
                    <strong>{secret ? "???" : m.achievements[id].label}</strong>
                    <span className="sr-only">{done ? "" : ` (${m.achievementLocked})`}</span>:{" "}
                    {secret ? m.achievementSecret : m.achievements[id].description}
                    {progress && (
                      <span
                        className="ml-1 font-bold tabular-nums"
                        data-testid="achievement-progress"
                      >
                        ({m.achievementProgress(progress[0], progress[1])})
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </RewardCard>

        <RewardCard title={m.statsTitle} testId="gym-stats">
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {statRows.map(([label, value]) => (
              <div key={label} className="border-border rounded-xl border-2 p-2">
                <dt className="text-muted text-xs">{label}</dt>
                <dd className="font-display text-xs">{value}</dd>
              </div>
            ))}
          </dl>
          {favorite && (
            <p className="text-sm">
              {m.stats.favorite}: <strong>{formatName(favorite)}</strong>
            </p>
          )}
        </RewardCard>
      </div>
    </Section>
  );
}

/** The rewards tab: reads the player's progress from localStorage. */
export function GymRewardsPage({
  legendaries,
  items,
}: {
  legendaries: BattlePokemon[];
  items: GameItem[];
}) {
  const { stats, achievements, bag } = useGymProgress();
  const { badges } = useBadges();
  const { today } = useToday();
  return (
    <>
      {today && (
        <div className="mb-8">
          <MissionsCard today={today} />
        </div>
      )}
      <GymRewards
        stats={stats}
        badges={badges}
        achievements={achievements}
        bag={bag}
        items={items}
        legendaries={legendaries}
      />
    </>
  );
}
