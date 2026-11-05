"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";

/** How far down (px) the page must be before scrolling down hides the header. */
const HIDE_AFTER = 96;
/** Ignore tiny scroll jitters (momentum, address bar resizes). */
const THRESHOLD = 8;

/**
 * A sticky header that slides away while the user scrolls down and comes back on the way up, on
 * phones only: there the header costs the most screen. Focus inside it always shows it.
 */
export function AutoHideHeader({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < THRESHOLD) return;
      setHidden(y > last && y > HIDE_AFTER);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "transition-transform duration-200 motion-reduce:transition-none",
        hidden && "max-sm:-translate-y-full max-sm:focus-within:translate-y-0",
        className,
      )}
      data-hidden={hidden || undefined}
    >
      {children}
    </header>
  );
}
