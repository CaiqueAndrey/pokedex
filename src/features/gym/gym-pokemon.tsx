import { TypeBadge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { messages } from "@/config/messages";
import { TYPE_STYLES } from "@/config/pokemon-types";
import { formatName, formatNumber } from "@/lib/format";
import type { BattlePokemon } from "@/types/battle";
import { STAT_NAMES } from "@/types/pokemon";
import { PokemonImage } from "../pokedex/pokemon-image";

/** Base stats as a compact 3×2 grid (easy mode). */
export function MiniStats({ pokemon }: { pokemon: BattlePokemon }) {
  return (
    <dl className="mt-1 grid w-full grid-cols-3 gap-x-2 text-xs" data-testid="mini-stats">
      {STAT_NAMES.map((stat) => (
        <div key={stat} className="flex justify-between gap-1">
          <dt className="text-muted">{messages.gym.statsShort[stat]}</dt>
          <dd className="font-bold">{pokemon.stats[stat]}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Compact Pokémon tile used across the gym screens. */
export function GymPokemon({
  pokemon,
  compact = false,
  showTypes = !compact,
  showStats = false,
  className,
  children,
}: {
  pokemon: BattlePokemon;
  compact?: boolean;
  showTypes?: boolean;
  showStats?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const primary = TYPE_STYLES[pokemon.types[0]];
  return (
    <div
      className={cn(
        "border-border relative flex flex-col items-center rounded-2xl border-2 p-2 text-center",
        pokemon.legendary && "border-amber-500",
        className,
      )}
      style={{
        background: `linear-gradient(160deg, color-mix(in srgb, ${primary.color} 30%, var(--surface)), var(--surface))`,
      }}
      data-testid="gym-pokemon"
    >
      <div className={cn("relative", compact ? "size-14" : "size-24")}>
        <PokemonImage id={pokemon.id} alt="" sizes={compact ? "56px" : "96px"} />
      </div>
      {!compact && (
        <span className="text-muted font-display text-[0.55rem]">{formatNumber(pokemon.id)}</span>
      )}
      <span className="font-display text-[0.6rem] leading-relaxed">{formatName(pokemon.name)}</span>
      {pokemon.legendary && (
        <span className="rounded-md bg-amber-500 px-1.5 text-[0.65rem] font-bold text-black">
          ✦ {messages.gym.legendaryTag}
        </span>
      )}
      {showTypes && (
        <div className="mt-1 flex flex-wrap justify-center gap-1">
          {pokemon.types.map((type) => (
            <TypeBadge key={type} type={type} className={compact ? "px-2 text-[0.65rem]" : ""} />
          ))}
        </div>
      )}
      {!compact && (
        <span className="mt-1 text-sm">
          {messages.gym.bst}: <strong>{pokemon.bst}</strong>
        </span>
      )}
      {showStats && <MiniStats pokemon={pokemon} />}
      {children}
    </div>
  );
}

/** Placeholder for an opponent Pokémon hidden in hard mode. */
export function HiddenPokemon({ index }: { index: number }) {
  return (
    <div
      className="border-border bg-surface flex min-h-24 flex-col items-center justify-center rounded-2xl border-2 border-dashed"
      data-testid="hidden-pokemon"
    >
      <span className="font-display text-muted text-lg" aria-hidden>
        ?
      </span>
      <span className="sr-only">
        {messages.gym.hiddenPokemon} {index + 1}
      </span>
    </div>
  );
}
