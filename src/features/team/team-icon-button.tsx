"use client";

import { Plus, Users } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { messages } from "@/config/messages";
import { useTeam } from "./use-team";

/** Compact add/remove-from-team toggle for cards. */
export function TeamIconButton({ name, label }: { name: string; label: string }) {
  const team = useTeam();
  const inTeam = team.has(name);
  const disabled = !inTeam && team.full;
  return (
    <button
      type="button"
      aria-pressed={inTeam}
      disabled={disabled}
      title={disabled ? messages.team.full : undefined}
      aria-label={inTeam ? messages.team.removeFrom(label) : messages.team.addTo(label)}
      onClick={() => team.toggle(name)}
      className={cn(
        "bg-background/80 text-foreground hover:bg-background relative inline-flex size-11 items-center justify-center rounded-full backdrop-blur disabled:opacity-40",
        inTeam && "text-primary-600",
      )}
    >
      <Users aria-hidden className={cn("size-5", inTeam && "fill-primary-600/30")} />
      {!inTeam && (
        <Plus aria-hidden className="bg-background absolute top-2 right-2 size-3 rounded-full" />
      )}
    </button>
  );
}
