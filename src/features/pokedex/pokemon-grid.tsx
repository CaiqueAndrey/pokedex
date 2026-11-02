import type { PokemonSummary } from "@/types/pokemon";
import { PokemonCard } from "./pokemon-card";

export function PokemonGrid({
  pokemon,
  renderActions,
}: {
  pokemon: PokemonSummary[];
  renderActions?: (pokemon: PokemonSummary) => React.ReactNode;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
      {pokemon.map((item, index) => (
        <PokemonCard
          key={item.name}
          pokemon={item}
          priority={index < 4}
          index={index}
          actions={renderActions?.(item)}
        />
      ))}
    </ul>
  );
}
