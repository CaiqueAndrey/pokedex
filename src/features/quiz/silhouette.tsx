"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/components/ui/cn";
import { messages } from "@/config/messages";
import { encodeImageToken } from "@/lib/quiz";

const q = messages.quiz;

/**
 * The stage: the Pokémon's official artwork painted black on a burst of rays, until the reveal
 * lifts the filter. The picture comes from our own route (an opaque token, not "25.png").
 */
export function Silhouette({
  id,
  revealed,
  clearer = false,
  name,
}: {
  id: number;
  revealed: boolean;
  /** The last hint: a lighter silhouette. */
  clearer?: boolean;
  /** Alt text once revealed. */
  name: string;
}) {
  const [failedId, setFailedId] = useState<number | null>(null);
  const failed = failedId === id;
  const filter = revealed ? "none" : clearer ? "brightness(0.45) contrast(1.4)" : "brightness(0)";

  return (
    <div
      className="border-foreground relative mx-auto aspect-square w-full max-w-64 overflow-hidden rounded-3xl border-4 shadow-[5px_5px_0_0_var(--border)] sm:max-w-80"
      style={{
        background:
          "radial-gradient(circle at center, #fff7d6 0 30%, transparent 31%), repeating-conic-gradient(from 0deg at 50% 50%, #38bdf8 0deg 10deg, #0ea5e9 10deg 20deg)",
      }}
      data-testid="silhouette"
      data-revealed={revealed || undefined}
    >
      {failed ? (
        <div className="grid size-full place-items-center p-6 text-center text-black">
          <span className="font-display text-5xl" aria-hidden>
            ?
          </span>
          <span className="text-sm">{q.imageError}</span>
        </div>
      ) : (
        <Image
          key={id}
          src={`/api/quiz/image/${encodeImageToken(id)}`}
          alt={revealed ? name : q.silhouetteAlt}
          fill
          unoptimized
          sizes="320px"
          draggable={false}
          className={cn(
            "object-contain p-4 transition-[filter] duration-700 select-none motion-reduce:transition-none",
            revealed && "motion-safe:animate-pop",
          )}
          style={{ filter }}
          onError={() => setFailedId(id)}
        />
      )}
    </div>
  );
}
