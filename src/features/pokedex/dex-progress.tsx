"use client";

import { Eye, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { messages } from "@/config/messages";
import { progressByGeneration } from "@/lib/dex-progress";
import { useDexProgress } from "./use-dex-progress";

const d = messages.dex;
const TOTAL = 1025;

/** A small mark on a Pokédex card: used on your team (★) or seen in a game (eye). */
export function DexMark({ id }: { id: number }) {
  const { seen, used } = useDexProgress();
  if (used.includes(id)) {
    return (
      <span
        className="bg-foreground text-background ml-1 inline-flex items-center gap-0.5 rounded-full px-1.5 align-middle text-[0.6rem] font-bold"
        title={d.usedLabel}
        data-testid="dex-used"
      >
        <Star aria-hidden className="size-3" />
        <span className="sr-only">{d.usedLabel}</span>
      </span>
    );
  }
  if (seen.includes(id)) {
    return (
      <span
        className="border-foreground/40 ml-1 inline-flex items-center rounded-full border px-1 align-middle"
        title={d.seenLabel}
        data-testid="dex-seen"
      >
        <Eye aria-hidden className="size-3" />
        <span className="sr-only">{d.seenLabel}</span>
      </span>
    );
  }
  return null;
}

/** "Sua Pokédex": seen and used so far, with a bar per generation. */
export function DexProgressCard() {
  const progress = useDexProgress();
  const rows = progressByGeneration(progress);
  return (
    <Card className="mb-6 grid gap-2" data-testid="dex-progress">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[0.65rem]">{d.title}</h2>
        <p className="text-sm tabular-nums" data-testid="dex-summary">
          {d.summary(progress.seen.length, progress.used.length, TOTAL)}
        </p>
      </div>
      <div className="bg-border h-2 overflow-hidden rounded-full" aria-hidden>
        <div
          className="h-full bg-linear-to-r from-sky-500 to-sky-600"
          style={{ width: `${(progress.seen.length / TOTAL) * 100}%` }}
        />
      </div>
      {progress.seen.length === 0 ? (
        <p className="text-muted text-sm">{d.empty}</p>
      ) : (
        <details>
          <summary className="text-muted cursor-pointer text-sm">{d.byGeneration}</summary>
          <ul className="mt-2 grid gap-1 sm:grid-cols-3">
            {rows.map((row) => (
              <li key={row.generation} className="grid gap-0.5 text-xs">
                <span>{d.generationRow(row.generation, row.seen, row.total)}</span>
                <span className="bg-border h-1.5 overflow-hidden rounded-full" aria-hidden>
                  <span
                    className="block h-full bg-sky-600"
                    style={{ width: `${(row.seen / row.total) * 100}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}
