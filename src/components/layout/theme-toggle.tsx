"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { z } from "zod";
import { messages } from "@/config/messages";
import { STORAGE_KEYS, writeStorage } from "@/lib/storage";

const themeSchema = z.enum(["light", "dark"]);
const EVENT = "pokedex:theme";

function effectiveTheme(): "light" | "dark" {
  const set = themeSchema.safeParse(document.documentElement.dataset.theme);
  if (set.success) return set.data;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener(EVENT, callback);
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    media.removeEventListener("change", callback);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, effectiveTheme, () => "light" as const);
  const next = theme === "dark" ? "light" : "dark";

  function toggle() {
    document.documentElement.dataset.theme = next;
    writeStorage(STORAGE_KEYS.theme, next);
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={messages.theme.toggle}
      title={theme === "dark" ? messages.theme.light : messages.theme.dark}
      className="hover:bg-border/60 inline-flex size-11 items-center justify-center rounded-xl"
    >
      {theme === "dark" ? (
        <Sun aria-hidden className="size-5" />
      ) : (
        <Moon aria-hidden className="size-5" />
      )}
    </button>
  );
}
