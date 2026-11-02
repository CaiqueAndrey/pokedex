import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { messages } from "@/config/messages";
import type { PokemonVariety } from "@/types/pokemon";

export function FormsSelector({
  varieties,
  current,
}: {
  varieties: PokemonVariety[];
  current: string;
}) {
  if (varieties.length < 2) return null;
  return (
    <nav aria-label={messages.detail.forms} className="mb-6">
      <ul className="flex flex-wrap gap-2">
        {varieties.map((variety) => (
          <li key={variety.name}>
            <Link
              href={`/pokemon/${variety.name}`}
              aria-current={variety.name === current ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium",
                variety.name === current
                  ? "border-primary-600 bg-primary-600 text-on-primary"
                  : "border-border hover:bg-border/60",
              )}
            >
              {variety.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
