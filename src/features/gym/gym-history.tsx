"use client";

import { Swords } from "lucide-react";
import Image from "next/image";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { messages } from "@/config/messages";
import { battlesWon, resultGrid, rewardFor, type HistoryEntry } from "@/lib/battle/progress";
import { battleCount, byName, gymOf } from "@/lib/battle/run";
import { topDamage } from "@/lib/battle/stats";
import { formatName } from "@/lib/format";
import { spriteUrl } from "@/lib/sprites";
import type { BattlePokemon } from "@/types/battle";
import { BallIcon } from "./ball-icon";
import { RunPath } from "./run-path";
import { useGymHistory } from "./use-gym";

const m = messages.gym;

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

/** One finished run: when, where, the score, the reward, the team, and the battles on demand. */
export function HistoryCard({ entry, pool }: { entry: HistoryEntry; pool: BattlePokemon[] }) {
  const { run } = entry;
  const gym = gymOf(run);
  const total = battleCount(run);
  const wins = battlesWon(run);
  const won = run.phase === "won";
  const reward = run.practice ? undefined : rewardFor(run);
  const mvp = topDamage(run.history.map((r) => r.damage));
  const names = byName(pool);

  return (
    <Card className="grid gap-3" data-testid="history-entry">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid gap-1">
          <p className="font-display text-[0.65rem] leading-relaxed">{gym.name}</p>
          <p className="text-muted text-sm">
            {formatWhen(entry.finishedAt)} · {m.modes[run.mode].label}
            {run.practice && ` · ${m.practiceBadge}`}
            {run.legendary && ` · ${m.hub.legendaryTitle}`}
          </p>
        </div>
        <span
          className={cn(
            "font-display rounded-full px-2 py-1 text-[0.55rem]",
            won ? "bg-green-600 text-white" : "bg-border",
          )}
        >
          {won ? m.history.won : m.history.lost}
        </span>
      </div>
      <p className="flex flex-wrap items-center gap-3 text-sm">
        <span>
          {resultGrid(wins, won, total)} {m.shareScore(wins, total)}
        </span>
        {reward && (
          <span className="flex items-center gap-1">
            <BallIcon ball={reward} className="size-6" />
            {m.balls[reward]}
          </span>
        )}
        {mvp && <span>⭐ {m.mvp(formatName(mvp))}</span>}
      </p>
      <ul className="flex flex-wrap" aria-label={m.yourTeam}>
        {run.picks.map((name) => {
          const pokemon = names.get(name);
          return (
            <li key={name} title={formatName(name)}>
              {pokemon && (
                <Image
                  src={spriteUrl(pokemon.id, "default")}
                  alt={formatName(name)}
                  width={48}
                  height={48}
                  unoptimized
                  className="size-12"
                />
              )}
            </li>
          );
        })}
      </ul>
      <details>
        <summary className="font-display cursor-pointer text-[0.6rem]">{m.history.details}</summary>
        <div className="mt-3">
          <RunPath run={run} pool={pool} />
        </div>
      </details>
    </Card>
  );
}

export function GymHistory({ pool }: { pool: BattlePokemon[] }) {
  const history = useGymHistory();
  return (
    <section aria-labelledby="history-title" className="grid gap-4">
      <div className="grid gap-1">
        <h1 id="history-title" className="text-sm sm:text-base">
          {m.history.title}
        </h1>
        <p className="text-muted text-base">{m.history.description}</p>
      </div>
      {history.length === 0 ? (
        <Card className="grid justify-items-start gap-3">
          <p>{m.history.empty}</p>
          <LinkButton href="/gym">
            <Swords aria-hidden className="size-4" />
            {m.history.play}
          </LinkButton>
        </Card>
      ) : (
        <ol className="grid gap-4">
          {history.map((entry) => (
            <li key={`${entry.finishedAt}-${entry.run.seed}`}>
              <HistoryCard entry={entry} pool={pool} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
