"use client";

import { Eye, Star, Swords } from "lucide-react";
import { messages } from "@/config/messages";
import { useGymProgress } from "../gym/use-gym";
import { useDexProgress } from "../pokedex/use-dex-progress";

const f = messages.facts;
const d = messages.dex;

/** What this Pokémon has done in your games: seen, used, and how often you drafted it. */
export function GameFacts({ id, name }: { id: number; name: string }) {
  const { seen, used } = useDexProgress();
  const { stats } = useGymProgress();
  const times = stats.used[name] ?? 0;
  const isUsed = used.includes(id);
  const isSeen = isUsed || seen.includes(id);
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm" data-testid="game-facts">
      <span className="font-display text-[0.6rem]">{f.title}:</span>
      {!isSeen && times === 0 ? (
        <span className="text-muted">{f.never}</span>
      ) : (
        <>
          {isUsed ? (
            <span className="flex items-center gap-1">
              <Star aria-hidden className="size-4" />
              {d.used}
            </span>
          ) : (
            isSeen && (
              <span className="flex items-center gap-1">
                <Eye aria-hidden className="size-4" />
                {d.seen}
              </span>
            )
          )}
          {times > 0 && (
            <span className="flex items-center gap-1">
              <Swords aria-hidden className="size-4" />
              {f.usedTimes(times)}
            </span>
          )}
        </>
      )}
    </p>
  );
}
