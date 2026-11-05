"use client";

import { Check, Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ACHIEVEMENTS, BALLS, GYMS, SELECTABLE_MODES, TRAINER_NAME_MAX } from "@/config/gym";
import { messages } from "@/config/messages";
import { favoritePick, formatDailyDate, levelFor, totalXp } from "@/lib/battle/progress";
import { formatName } from "@/lib/format";
import type { BattlePokemon } from "@/types/battle";
import { PokemonImage } from "../pokedex/pokemon-image";
import { BallIcon } from "./ball-icon";
import { GymBadge } from "./gym-badge";
import { ResetProgress } from "./reset-progress";
import { useBadges, useGymProgress, useTrainer } from "./use-gym";

const m = messages.gym;
const t = m.trainer;

/** XP progress towards the next level, as a meter. */
export function XpBar({ into, needed, label }: { into: number; needed: number; label: string }) {
  const ratio = needed > 0 ? Math.min(1, into / needed) : 1;
  return (
    <div
      className="bg-border h-3 overflow-hidden rounded-full"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={needed}
      aria-valuenow={into}
    >
      <div
        className="h-full bg-linear-to-r from-amber-400 to-amber-600 transition-all duration-700"
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}

/**
 * The Trainer Card (like a game's, or 7a0's membership card): a name typed once (no login), an ID,
 * the level and rank from XP, and the collection at a glance.
 */
export function TrainerCard({ pool }: { pool: BattlePokemon[] }) {
  const { trainer, rename } = useTrainer();
  const { stats, achievements } = useGymProgress();
  const { badges } = useBadges();
  const [draft, setDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const progress = levelFor(totalXp(stats));
  const favorite = favoritePick(stats);
  const partner = favorite ? pool.find((p) => p.name === favorite) : undefined;
  const known = new Set<string>(ACHIEVEMENTS);
  const unlocked = achievements.filter((id) => known.has(id)).length;
  const value = draft ?? trainer?.name ?? "";

  function save(event: React.FormEvent) {
    event.preventDefault();
    rename(value);
    setDraft(null);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <article
        className="border-foreground relative overflow-hidden rounded-3xl border-4 shadow-[6px_6px_0_0_var(--border)]"
        aria-labelledby="trainer-card-title"
        data-testid="trainer-card"
      >
        <header className="from-primary-600 to-primary-700 text-on-primary flex items-center justify-between gap-3 bg-linear-to-r px-5 py-3">
          <h1 id="trainer-card-title" className="text-xs sm:text-sm">
            {t.title}
          </h1>
          {trainer && <span className="font-display text-[0.6rem]">{t.id(trainer.id)}</span>}
        </header>
        <div className="bg-surface grid gap-5 p-5 sm:grid-cols-[1fr_auto]">
          <div className="grid content-start gap-3">
            <p className="font-display text-sm leading-relaxed" data-testid="trainer-name">
              {trainer?.name ?? m.hub.chooseName}
            </p>
            <p className="text-muted text-sm">
              {t.ranks[progress.rank]}
              {trainer && ` · ${t.since(formatDailyDate(trainer.since))}`}
            </p>
            <div className="grid gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-[0.65rem]" data-testid="trainer-level">
                  {t.level(progress.level)}
                </span>
                <span className="text-sm tabular-nums">{t.xp(progress.into, progress.needed)}</span>
              </div>
              <XpBar
                into={progress.into}
                needed={progress.needed}
                label={t.level(progress.level)}
              />
              <p className="text-muted text-xs">{t.xpTotal(progress.xp)}</p>
            </div>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                [
                  t.badges,
                  `${badges.filter((id) => SELECTABLE_MODES.some((mode) => GYMS[mode].badgeId === id)).length}/2`,
                ],
                [t.balls, BALLS.reduce((sum, ball) => sum + stats.balls[ball], 0)],
                [t.legends, stats.caught.length],
                [t.achievements, `${unlocked}/${ACHIEVEMENTS.length}`],
              ].map(([label, count]) => (
                <div key={label} className="border-border rounded-xl border-2 p-2">
                  <dt className="text-muted text-xs">{label}</dt>
                  <dd className="font-display text-xs">{count}</dd>
                </div>
              ))}
            </dl>
            <ul className="flex flex-wrap items-center gap-3" aria-label={t.badges}>
              {SELECTABLE_MODES.map((mode) => {
                const gym = GYMS[mode];
                if (!gym.badgeId || !gym.badge || !gym.badgeImage) return null;
                return (
                  <li key={mode}>
                    <GymBadge
                      src={gym.badgeImage}
                      label={gym.badge}
                      earned={badges.includes(gym.badgeId)}
                      className="size-12"
                    />
                  </li>
                );
              })}
              {BALLS.filter((ball) => stats.balls[ball] > 0).map((ball) => (
                <li key={ball}>
                  <BallIcon ball={ball} className="size-9" />
                </li>
              ))}
            </ul>
          </div>
          {partner && (
            <figure className="grid justify-items-center gap-1">
              <div className="relative size-32">
                <PokemonImage
                  id={partner.id}
                  alt={formatName(partner.name)}
                  sizes="128px"
                  className="animate-float"
                />
              </div>
              <figcaption className="text-muted text-xs">
                {t.favorite}: <strong>{formatName(partner.name)}</strong>
              </figcaption>
            </figure>
          )}
        </div>
      </article>

      <Card className="grid content-start gap-3">
        <form onSubmit={save} className="grid gap-2">
          <label htmlFor="trainer-name-input" className="font-display text-[0.6rem]">
            {t.nameLabel}
          </label>
          <input
            id="trainer-name-input"
            value={value}
            maxLength={TRAINER_NAME_MAX}
            placeholder={t.namePlaceholder}
            onChange={(event) => setDraft(event.target.value)}
            className="border-border bg-background min-h-11 rounded-xl border-2 px-3 text-base"
            autoComplete="nickname"
          />
          <Button type="submit" disabled={!value.trim()}>
            {saved ? (
              <Check aria-hidden className="size-4" />
            ) : (
              <Pencil aria-hidden className="size-4" />
            )}
            <span aria-live="polite">{saved ? t.saved : t.save}</span>
          </Button>
        </form>
        <p className="text-muted text-sm">{t.description}</p>
        <p className="text-muted text-sm">{t.xpHow}</p>
      </Card>
      <div className="lg:col-start-2">
        <ResetProgress />
      </div>
    </div>
  );
}
