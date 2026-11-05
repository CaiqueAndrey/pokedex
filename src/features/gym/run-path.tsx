import { Check, Crown, Swords, X } from "lucide-react";
import Image from "next/image";
import { cn } from "@/components/ui/cn";
import { messages } from "@/config/messages";
import { byName, gymOf, trainersFor, type GymRun } from "@/lib/battle/run";
import { topDamage } from "@/lib/battle/stats";
import { formatName } from "@/lib/format";
import { spriteUrl } from "@/lib/sprites";
import type { BattlePokemon } from "@/types/battle";

const m = messages.gym;

function Sprites({
  names,
  pool,
  label,
}: {
  names: string[];
  pool: BattlePokemon[];
  label: string;
}) {
  const map = byName(pool);
  return (
    <div>
      <p className="text-muted text-xs">{label}</p>
      <ul className="flex flex-wrap" aria-label={label}>
        {names.map((name) => {
          const pokemon = map.get(name);
          return (
            <li key={name} title={formatName(name)}>
              {pokemon && (
                <Image
                  src={spriteUrl(pokemon.id, "default")}
                  alt={formatName(name)}
                  width={40}
                  height={40}
                  unoptimized
                  className="size-10"
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The five gym battles as a track: past battles with their result and both teams, the next one,
 * and what's still ahead. Doubles as the run history and the end-of-run summary.
 */
export function RunPath({
  run,
  pool,
  showTeams = true,
}: {
  run: GymRun;
  pool: BattlePokemon[];
  showTeams?: boolean;
}) {
  const trainers = trainersFor(run);
  return (
    <section aria-labelledby="path-title" className="grid gap-3" data-testid="run-path">
      <h2 id="path-title" className="text-[0.65rem]">
        {m.pathTitle}
      </h2>
      <ol className="grid gap-2">
        {gymOf(run).battles.map((battle, index) => {
          const trainer = trainers[index] ?? "";
          const record = run.history.find((r) => r.battle === index);
          const mvp = record ? topDamage([record.damage]) : undefined;
          const isNext = !record && index === run.battle && run.phase === "ready";
          const status = record ? (record.won ? "won" : "lost") : isNext ? "next" : "upcoming";
          const Icon = {
            won: Check,
            lost: X,
            next: Swords,
            upcoming: battle.leader ? Crown : Swords,
          }[status];
          return (
            <li
              key={index}
              className={cn(
                "border-border animate-fade-up flex gap-3 rounded-2xl border-2 p-3",
                status === "won" && "bg-green-500/10",
                status === "lost" && "bg-primary-600/10",
                status === "next" && "border-primary-600 bg-surface",
                status === "upcoming" && "opacity-70",
              )}
              style={{ animationDelay: `${index * 60}ms` }}
              data-testid={`path-${status}`}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full border-2",
                  status === "won" && "border-green-600 bg-green-600 text-white",
                  status === "lost" && "border-primary-600 bg-primary-600 text-on-primary",
                  status === "next" && "border-primary-600 motion-safe:animate-pulse",
                  status === "upcoming" && "border-border",
                )}
              >
                <Icon aria-hidden className="size-4" />
              </span>
              <div className="grid min-w-0 flex-1 gap-1">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-display text-[0.6rem] leading-relaxed">
                    {index + 1}. {trainer}
                  </span>
                  {battle.leader && (
                    <span className="text-muted text-xs">
                      {run.mode === "daily" ? m.boss : m.leader}
                    </span>
                  )}
                </p>
                <p className="text-sm">
                  {record
                    ? record.won
                      ? m.pathWon(record.remaining)
                      : m.pathLost(record.opponentRemaining)
                    : isNext
                      ? m.pathCurrent
                      : m.pathUpcoming}
                </p>
                {record && (
                  <p className="text-muted flex flex-wrap gap-x-3 text-xs" data-testid="path-score">
                    <span className="font-display text-foreground text-[0.55rem]">
                      {m.score(
                        record.opponent.length - record.opponentRemaining,
                        record.order.length - record.remaining,
                      )}
                    </span>
                    {mvp && <span>⭐ {m.battleMvp(formatName(mvp), record.damage[mvp] ?? 0)}</span>}
                  </p>
                )}
                {record && showTeams && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <Sprites names={record.order} pool={pool} label={m.historyYourTeam} />
                    <Sprites names={record.opponent} pool={pool} label={m.historyOpponent} />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
