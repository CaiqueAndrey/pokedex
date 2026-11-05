import { Shuffle } from "lucide-react";
import { redirect } from "next/navigation";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { messages } from "@/config/messages";
import { GymBanner } from "@/features/gym/gym-banner";
import { QuizBanner } from "@/features/quiz/quiz-banner";
import { Filters } from "@/features/pokedex/filters";
import { InfiniteGrid } from "@/features/pokedex/infinite-grid";
import { ViewToggle } from "@/features/pokedex/view-toggle";
import { Pagination } from "@/features/pokedex/pagination";
import { PokemonGrid } from "@/features/pokedex/pokemon-grid";
import {
  filterPokemon,
  filtersToSearchParams,
  paginate,
  parseFilters,
  sortPokemon,
} from "@/lib/filters";
import { getPokedex } from "@/server/pokedex/next-cache";
import { PAGE_SIZE } from "@/config/pokedex";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseFilters(await searchParams);
  const all = await getPokedex().listPokemon();
  const results = sortPokemon(filterPokemon(all, filters), filters.sort, filters.order);
  const scroll = filters.view === "scroll";
  const pagination = paginate(results.length, scroll ? 1 : filters.page);

  // Out-of-range page → last valid page.
  if (!scroll && pagination.page !== filters.page) {
    const query = filtersToSearchParams({ ...filters, page: pagination.page }).toString();
    redirect(query ? `/?${query}` : "/");
  }

  const pageItems = results.slice((pagination.page - 1) * PAGE_SIZE, pagination.page * PAGE_SIZE);
  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.generation !== undefined ||
    filters.forms !== "none" ||
    filters.sort !== "number" ||
    filters.order !== "asc" ||
    filters.q !== "";

  return (
    <>
      <PageHeader
        title={messages.appName}
        description={messages.appDescription}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton href="/random" prefetch={false} variant="secondary">
              <Shuffle aria-hidden className="size-4" />
              {messages.random.surprise}
            </LinkButton>
            <ViewToggle />
          </div>
        }
      />
      {/* The gym mode's front door; out of the way once the user is searching. */}
      {!hasActiveFilters && (
        <>
          <GymBanner />
          <QuizBanner />
        </>
      )}
      <Filters hasActiveFilters={hasActiveFilters} />
      <p className="text-muted mb-4 text-sm" aria-live="polite" data-testid="results-count">
        {results.length === 0
          ? messages.list.resultsEmpty
          : scroll
            ? messages.list.found(results.length)
            : messages.list.results(pagination.from, pagination.to, pagination.total)}
      </p>
      {results.length === 0 ? (
        <EmptyState
          title={messages.list.empty}
          description={messages.list.emptyHint}
          action={
            hasActiveFilters && (
              <LinkButton href="/" variant="secondary">
                {messages.filters.clear}
              </LinkButton>
            )
          }
        />
      ) : scroll ? (
        <InfiniteGrid
          key={filtersToSearchParams(filters).toString()}
          initial={pageItems}
          hasMore={pagination.totalPages > 1}
          filters={filters}
        />
      ) : (
        <>
          <PokemonGrid pokemon={pageItems} />
          <Pagination pagination={pagination} filters={filters} />
        </>
      )}
    </>
  );
}
