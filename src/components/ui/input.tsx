import type { InputHTMLAttributes } from "react";
import { cn } from "./cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "border-border bg-background text-foreground placeholder:text-muted min-h-11 w-full rounded-xl border px-3 text-sm",
        className,
      )}
      {...props}
    />
  );
}
