import { TYPE_STYLES } from "@/config/pokemon-types";
import type { PokemonTypeName } from "@/types/pokemon";
import { cn } from "./cn";

export function TypeBadge({ type, className }: { type: PokemonTypeName; className?: string }) {
  const style = TYPE_STYLES[type];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold",
        className,
      )}
      style={{ backgroundColor: style.color, color: style.textColor }}
    >
      {style.label}
    </span>
  );
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "border-border bg-background text-muted inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}
