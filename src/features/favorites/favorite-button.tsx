"use client";

import { Heart } from "lucide-react";
import { messages } from "@/config/messages";
import { cn } from "@/components/ui/cn";
import { useFavorites } from "./use-favorites";

export function FavoriteButton({
  name,
  label,
  className,
}: {
  name: string;
  label: string;
  className?: string;
}) {
  const { has, toggle } = useFavorites();
  const active = has(name);
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? messages.favorites.remove(label) : messages.favorites.add(label)}
      onClick={() => toggle(name)}
      className={cn(
        "bg-background/80 text-foreground hover:bg-background inline-flex size-11 items-center justify-center rounded-full backdrop-blur",
        className,
      )}
    >
      <Heart aria-hidden className={cn("size-5", active && "fill-primary-600 text-primary-600")} />
    </button>
  );
}
