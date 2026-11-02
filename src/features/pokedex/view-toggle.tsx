"use client";

import { LayoutGrid, ScrollText } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { messages } from "@/config/messages";
import type { ViewMode } from "@/lib/filters";
import { useUrlFilters } from "./use-url-filters";

const options = [
  { value: "pages", label: messages.list.viewPages, Icon: LayoutGrid },
  { value: "scroll", label: messages.list.viewScroll, Icon: ScrollText },
] as const satisfies readonly { value: ViewMode; label: string; Icon: unknown }[];

export function ViewToggle() {
  const { filters, update } = useUrlFilters();
  return (
    <div role="group" aria-label={messages.list.viewLabel} className="flex gap-1">
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={filters.view === value}
          onClick={() => filters.view !== value && update({ view: value })}
          className={cn(
            "font-display inline-flex min-h-11 items-center gap-2 border-2 px-3 text-[0.6rem] transition-colors",
            filters.view === value
              ? "border-foreground bg-primary-600 text-on-primary"
              : "border-border bg-surface hover:bg-border/60",
          )}
        >
          <Icon aria-hidden className="size-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
