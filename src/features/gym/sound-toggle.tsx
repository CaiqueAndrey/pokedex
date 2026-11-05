"use client";

import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { useSound } from "./use-gym";

const m = messages.gym;

export function SoundToggle() {
  const { enabled, setEnabled } = useSound();
  const Icon = enabled ? Volume2 : VolumeX;
  return (
    <Button
      variant="ghost"
      aria-pressed={enabled}
      aria-label={m.soundLabel}
      title={enabled ? m.soundOn : m.soundOff}
      onClick={() => setEnabled(!enabled)}
      data-testid="sound-toggle"
    >
      <Icon aria-hidden className="size-4" />
      <span className="sr-only sm:not-sr-only">{enabled ? m.soundOn : m.soundOff}</span>
    </Button>
  );
}
