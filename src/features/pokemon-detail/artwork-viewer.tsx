"use client";

import { Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { PokemonImage } from "../pokedex/pokemon-image";

export function ArtworkViewer({
  id,
  name,
  artwork,
  cry,
}: {
  id: number;
  name: string;
  artwork: { default: string; shiny: string };
  cry?: string;
}) {
  const [shiny, setShiny] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="animate-float relative aspect-square w-full max-w-sm drop-shadow-[0_12px_12px_rgba(0,0,0,0.25)]">
        <PokemonImage
          id={id}
          src={shiny ? artwork.shiny : artwork.default}
          alt={shiny ? `${name} (${messages.detail.shiny})` : name}
          sizes="(min-width: 768px) 384px, 90vw"
          priority
        />
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          variant="secondary"
          aria-pressed={shiny}
          aria-label={messages.detail.toggleShiny}
          onClick={() => setShiny((value) => !value)}
        >
          {shiny ? messages.detail.normal : messages.detail.shiny}
        </Button>
        {cry && (
          <>
            <Button variant="secondary" onClick={() => void audio.current?.play()}>
              <Volume2 aria-hidden className="size-4" />
              {messages.detail.cry}
            </Button>
            <audio ref={audio} src={cry} preload="none" />
          </>
        )}
      </div>
    </div>
  );
}
