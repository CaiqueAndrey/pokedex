import { Heart, Scale, Shuffle, Swords, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { SearchBar } from "@/features/pokedex/search-bar";
import { messages } from "@/config/messages";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { href: "/gym", label: messages.nav.gym, Icon: Swords },
  { href: "/favorites", label: messages.nav.favorites, Icon: Heart },
  { href: "/team", label: messages.nav.team, Icon: Users },
  { href: "/compare", label: messages.nav.compare, Icon: Scale },
  { href: "/random", label: messages.nav.random, Icon: Shuffle, prefetch: false },
];

export function SiteHeader() {
  return (
    <header className="border-border bg-background/95 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <Link href="/" className="flex shrink-0 items-center" aria-label={messages.appName}>
          <Image
            src="/img/pokedex-logo.png"
            alt={messages.appName}
            width={374}
            height={135}
            priority
            className="h-10 w-auto"
          />
        </Link>
        <nav
          aria-label={messages.nav.main}
          className="order-2 ml-auto flex items-center sm:order-3 sm:ml-0"
        >
          <ul className="flex items-center">
            {links.map(({ href, label, Icon, prefetch }) => (
              <li key={href}>
                <Link
                  href={href}
                  prefetch={prefetch}
                  aria-label={label}
                  title={label}
                  className="hover:bg-border/60 inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-2 text-sm font-medium lg:px-3"
                >
                  <Icon aria-hidden className="size-5" />
                  <span className="hidden lg:inline">{label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <ThemeToggle />
        </nav>
        <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1">
          <Suspense fallback={<div className="h-11" />}>
            <SearchBar />
          </Suspense>
        </div>
      </div>
      <div
        aria-hidden
        className="animate-pan from-primary-600 h-1 bg-linear-to-r via-amber-400 to-blue-500 bg-[length:200%_100%]"
      />
    </header>
  );
}
