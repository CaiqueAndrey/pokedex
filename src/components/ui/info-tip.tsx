"use client";

import { Info, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { messages } from "@/config/messages";
import { cn } from "./cn";

/**
 * A small "ⓘ" that reveals an explanation on tap or click, so secondary text doesn't crowd the
 * screen. A disclosure (button + region): keyboard and screen readers work; Esc or a tap outside
 * closes it. On phones the text opens as a sheet above the bottom bar, on wider screens as a bubble
 * under the icon. The text stays in the DOM (hidden), so it is searchable and testable.
 */
export function InfoTip({
  label,
  children,
  className,
  testId,
}: {
  /** What the tip is about ("Campo", "Limite de força"): names the button. */
  label: string;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  return (
    <span ref={ref} className={cn("relative inline-flex align-middle", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={messages.tip.more(label)}
        title={label}
        onClick={() => setOpen((value) => !value)}
        className="text-muted hover:text-foreground inline-flex size-8 items-center justify-center rounded-full"
      >
        <Info aria-hidden className="size-4" />
      </button>
      <span
        id={id}
        role="note"
        hidden={!open}
        className="border-border bg-surface text-foreground fixed inset-x-3 bottom-28 z-40 grid gap-1 rounded-2xl border-2 p-3 text-left text-sm font-normal shadow-[4px_4px_0_0_var(--border)] sm:absolute sm:inset-x-auto sm:top-full sm:bottom-auto sm:left-0 sm:mt-1 sm:w-72"
        data-testid={testId}
      >
        <span className="flex items-start justify-between gap-2">
          <strong className="font-display text-[0.55rem] leading-relaxed">{label}</strong>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={messages.tip.close}
            className="text-muted -m-1 p-1 sm:hidden"
          >
            <X aria-hidden className="size-4" />
          </button>
        </span>
        <span>{children}</span>
      </span>
    </span>
  );
}
