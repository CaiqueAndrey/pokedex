"use client";

import { Lightbulb } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { useTips } from "./use-gym";

export type TipId = keyof typeof messages.gym.tips;

const noop = () => () => {};

/**
 * A one-time hint for a first run: shown inline (never over the game) until "Entendi" is tapped,
 * then remembered. Rendered only after hydration, since the server can't know what was seen.
 */
export function Tip({ id }: { id: TipId }) {
  const { seen, dismiss } = useTips();
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  if (!hydrated || seen.includes(id)) return null;
  const tip = messages.gym.tips[id];
  return (
    <aside
      className="animate-fade-up flex items-start gap-3 rounded-2xl border-2 border-amber-500 bg-amber-500/10 p-3"
      aria-label={tip.title}
      data-testid={`tip-${id}`}
    >
      <Lightbulb
        aria-hidden
        className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400"
      />
      <div className="grid flex-1 gap-1">
        <p className="font-display text-[0.6rem] leading-relaxed">{tip.title}</p>
        <p className="text-sm">{tip.text}</p>
      </div>
      <Button variant="ghost" className="shrink-0" onClick={() => dismiss(id)}>
        {messages.gym.tipDismiss}
      </Button>
    </aside>
  );
}
