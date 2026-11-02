import type { SelectHTMLAttributes } from "react";
import { cn } from "./cn";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "border-border bg-background text-foreground min-h-11 w-full rounded-xl border px-3 text-sm",
        className,
      )}
      {...props}
    />
  );
}
