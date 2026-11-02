import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "font-display inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-4 text-[0.65rem] leading-none transition-all active:translate-y-0.5 disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-linear-to-b from-primary-600 to-primary-700 text-on-primary shadow-[0_3px_0_0_var(--primary-700)] hover:brightness-110 active:shadow-none",
  secondary:
    "border-2 border-border bg-surface text-foreground shadow-[0_3px_0_0_var(--border)] hover:bg-border/60 active:shadow-none",
  ghost: "text-foreground hover:bg-border/60",
};

export function buttonClass(variant: Variant = "primary", className?: string) {
  return cn(base, variants[variant], className);
}

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
