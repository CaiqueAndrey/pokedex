import { cn } from "./cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("bg-border/70 animate-pulse rounded-xl", className)} />;
}
