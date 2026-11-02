"use client";

import Image from "next/image";
import { useState } from "react";
import { messages } from "@/config/messages";
import { spriteUrl } from "@/lib/sprites";

/** Official artwork with fallback to the default sprite, then to a text placeholder. */
export function PokemonImage({
  id,
  src,
  alt,
  sizes,
  priority,
  className,
}: {
  id: number;
  src?: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const sources = [src ?? spriteUrl(id, "official"), spriteUrl(id, "default")];
  const [attempt, setAttempt] = useState(0);
  const current = sources[attempt];

  if (!current) {
    return (
      <div className="text-muted flex size-full items-center justify-center text-xs">
        {messages.detail.noArtwork}
      </div>
    );
  }
  return (
    <Image
      key={current}
      src={current}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className ?? "object-contain"}
      onError={() => setAttempt((n) => n + 1)}
    />
  );
}
