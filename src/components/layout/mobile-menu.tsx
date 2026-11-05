"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { messages } from "@/config/messages";
import { NAV_LINKS } from "./nav-links";

/**
 * Phones get one menu button instead of a row of icons that wraps the header onto a second line.
 * A native `<details>`: keyboard and screen readers work without extra code; it closes on
 * navigation and on a tap outside.
 */
export function MobileMenu() {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const menu = ref.current;
      if (menu?.open && !menu.contains(event.target as Node)) menu.open = false;
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <details ref={ref} className="relative sm:hidden" data-testid="mobile-menu">
      <summary className="hover:bg-border/60 inline-flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-xl [&::-webkit-details-marker]:hidden">
        <Menu aria-hidden className="size-5" />
        <span className="sr-only">{messages.nav.menu}</span>
      </summary>
      <ul className="border-border bg-surface absolute top-full right-0 z-40 mt-2 grid w-56 gap-1 rounded-2xl border-2 p-2 shadow-[4px_4px_0_0_var(--border)]">
        {NAV_LINKS.map(({ href, label, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="hover:bg-border/60 flex min-h-11 items-center gap-3 rounded-xl px-3 text-base font-medium"
            >
              <Icon aria-hidden className="size-5" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
