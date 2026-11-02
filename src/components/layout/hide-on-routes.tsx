"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Focus routes (the gym game) trade page chrome for screen space, especially on phones. */
export const FOCUS_ROUTES = ["/gym"];

export function isFocusRoute(pathname: string) {
  return FOCUS_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function HideOnFocusRoutes({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return isFocusRoute(pathname) ? null : children;
}
