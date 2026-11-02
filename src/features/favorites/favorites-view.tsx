"use client";

import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { messages } from "@/config/messages";
import { PokemonGrid } from "../pokedex/pokemon-grid";
import { usePokemonSummaries } from "../pokedex/use-pokemon-summaries";
import { useFavorites } from "./use-favorites";

export function FavoritesView() {
  const { names } = useFavorites();
  const { results, loading, failed } = usePokemonSummaries(names);

  if (failed) {
    return <EmptyState title={messages.errors.title} description={messages.errors.description} />;
  }
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (results.length === 0) {
    return (
      <EmptyState
        title={messages.favorites.empty}
        description={messages.favorites.emptyHint}
        action={<LinkButton href="/">{messages.favorites.goToPokedex}</LinkButton>}
      />
    );
  }
  return <PokemonGrid pokemon={results} />;
}
