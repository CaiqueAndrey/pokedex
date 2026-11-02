"use client";

import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { useTeam } from "./use-team";

export function TeamButton({ name }: { name: string }) {
  const team = useTeam();
  const inTeam = team.has(name);
  const disabled = !inTeam && team.full;
  return (
    <Button
      variant="secondary"
      aria-pressed={inTeam}
      disabled={disabled}
      title={disabled ? messages.team.full : undefined}
      onClick={() => team.toggle(name)}
    >
      {inTeam ? <Check aria-hidden className="size-4" /> : <Plus aria-hidden className="size-4" />}
      {inTeam ? messages.team.inTeam : messages.team.add}
    </Button>
  );
}
