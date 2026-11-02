import Link from "next/link";
import { TypeBadge } from "@/components/ui/badge";
import { messages } from "@/config/messages";
import { TYPE_STYLES } from "@/config/pokemon-types";
import { displayName, formatNumber } from "@/lib/format";
import type { PokemonSummary } from "@/types/pokemon";
import { FavoriteButton } from "../favorites/favorite-button";
import { TeamIconButton } from "../team/team-icon-button";
import { PokemonImage } from "./pokemon-image";

export function PokemonCard({
  pokemon,
  priority = false,
  index = 0,
  actions,
}: {
  pokemon: PokemonSummary;
  priority?: boolean;
  /** Position in the grid; drives the staggered entrance animation. */
  index?: number;
  actions?: React.ReactNode;
}) {
  const name = displayName(pokemon);
  const primary = TYPE_STYLES[pokemon.types[0]];
  const secondary = TYPE_STYLES[pokemon.types[1] ?? pokemon.types[0]];
  return (
    <li
      className="group border-border animate-fade-up relative overflow-hidden rounded-2xl border-2 shadow-[4px_4px_0_0_var(--border)] transition-all duration-200 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[6px_6px_0_0_var(--type-a)]"
      style={
        {
          "--type-a": primary.color,
          animationDelay: `${Math.min(index, 12) * 40}ms`,
          background: `linear-gradient(150deg, color-mix(in srgb, ${primary.color} 38%, var(--surface)) 0%, color-mix(in srgb, ${secondary.color} 14%, var(--surface)) 100%)`,
        } as React.CSSProperties
      }
      data-testid="pokemon-card"
    >
      <Link
        href={`/pokemon/${pokemon.name}`}
        aria-label={messages.card.open(name)}
        className="block p-3 pb-14 after:absolute after:inset-0"
      >
        <span className="font-display text-muted text-[0.6rem]">
          {formatNumber(pokemon.speciesId)}
        </span>
        <div className="relative mx-auto my-1 aspect-square w-full max-w-44 transition-transform duration-300 group-hover:scale-110 motion-safe:group-hover:-rotate-3">
          <PokemonImage
            id={pokemon.id}
            alt=""
            sizes="(min-width: 1024px) 176px, (min-width: 640px) 25vw, 45vw"
            priority={priority}
          />
        </div>
        <h2 className="mt-1 text-[0.65rem] leading-relaxed">{name}</h2>
      </Link>
      <div className="absolute inset-x-3 bottom-3 flex flex-wrap gap-1">
        {pokemon.types.map((type) => (
          <TypeBadge key={type} type={type} />
        ))}
      </div>
      <div className="absolute top-1 right-1 z-10 flex">
        {actions}
        <TeamIconButton name={pokemon.name} label={name} />
        <FavoriteButton name={pokemon.name} label={name} />
      </div>
    </li>
  );
}
