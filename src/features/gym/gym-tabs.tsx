"use client";

import { Award, History, Swords, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";
import { messages } from "@/config/messages";
import { levelFor, totalXp } from "@/lib/battle/progress";
import { useGymFocus, useGymProgress, useTrainer } from "./use-gym";

const m = messages.gym;

const TABS = [
  { href: "/gym", label: m.tabs.play, Icon: Swords },
  { href: "/gym/recompensas", label: m.tabs.rewards, Icon: Award },
  { href: "/gym/historico", label: m.tabs.history, Icon: History },
  { href: "/gym/treinador", label: m.tabs.trainer, Icon: UserRound },
] as const;

/**
 * The gym's own navigation: play, rewards, history and the Trainer Card, plus your level. One row
 * on phones (icon over label), and out of the way while a run is on screen: the run bar takes over.
 */
export function GymTabs() {
  const pathname = usePathname();
  const focus = useGymFocus();
  const { trainer } = useTrainer();
  const { stats } = useGymProgress();
  const { level } = levelFor(totalXp(stats));

  if (focus && pathname === "/gym") return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
      <nav aria-label={m.tabs.label} className="w-full sm:w-auto">
        <ul className="grid grid-cols-4 gap-1 sm:flex">
          {TABS.map(({ href, label, Icon }) => {
            const active = href === "/gym" ? pathname === "/gym" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "font-display flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border-2 px-1 py-1 text-[0.5rem] whitespace-nowrap transition-all sm:flex-row sm:gap-2 sm:px-3 sm:text-[0.6rem]",
                    active
                      ? "border-foreground bg-primary-600 text-on-primary shadow-[0_3px_0_0_var(--foreground)]"
                      : "border-border bg-surface hover:bg-border/60",
                  )}
                >
                  <Icon aria-hidden className="size-4" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {/* Phones already have the Trainer tab; the chip is a desktop nicety. */}
      <Link
        href="/gym/treinador"
        className="border-border bg-surface hover:bg-border/60 hidden min-h-11 items-center gap-2 rounded-full border-2 px-3 text-sm sm:inline-flex"
        data-testid="trainer-chip"
      >
        <span className="bg-primary-600 text-on-primary font-display rounded-full px-2 py-0.5 text-[0.55rem]">
          {m.trainer.level(level)}
        </span>
        <span className="font-bold">{trainer?.name ?? m.hub.chooseName}</span>
      </Link>
    </div>
  );
}
