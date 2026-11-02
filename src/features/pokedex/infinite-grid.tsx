"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { filtersToSearchParams, type PokedexFilters } from "@/lib/filters";
import type { PokemonSummary } from "@/types/pokemon";
import { PokemonGrid } from "./pokemon-grid";

/**
 * Infinite scroll: the server renders page 1, then this appends further pages from /api/pokemon
 * as the sentinel nears the viewport. The parent remounts it (via `key`) when filters change.
 */
export function InfiniteGrid({
  initial,
  hasMore: initialHasMore,
  filters,
}: {
  initial: PokemonSummary[];
  hasMore: boolean;
  filters: PokedexFilters;
}) {
  const [items, setItems] = useState(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  // Refs, not state: an observer callback from a stale render must not re-request a page.
  const loadedPage = useRef(1);
  const more = useRef(initialHasMore);

  const loadMore = useCallback(async () => {
    if (busy.current || !more.current) return;
    busy.current = true;
    setStatus("loading");
    try {
      const page = loadedPage.current + 1;
      const params = filtersToSearchParams({ ...filters, view: "pages", page });
      params.set("list", "1");
      const response = await fetch(`/api/pokemon?${params.toString()}`);
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { results: PokemonSummary[]; hasMore: boolean };
      loadedPage.current = page;
      more.current = data.hasMore;
      setItems((current) => [...current, ...data.results]);
      setHasMore(data.hasMore);
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      busy.current = false;
    }
  }, [filters]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore || status === "error") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "600px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, status]);

  return (
    <>
      <PokemonGrid pokemon={items} />
      <div
        ref={sentinel}
        className="mt-8 flex min-h-11 flex-col items-center gap-3"
        aria-live="polite"
      >
        {status === "loading" && (
          <span className="font-display animate-pulse text-xs">{messages.list.loadingMore}</span>
        )}
        {status === "error" && (
          <>
            <span className="text-sm">{messages.errors.description}</span>
            <Button onClick={() => void loadMore()}>{messages.errors.retry}</Button>
          </>
        )}
        {status === "idle" && hasMore && (
          <Button variant="secondary" onClick={() => void loadMore()}>
            {messages.list.loadMore}
          </Button>
        )}
        {!hasMore && <span className="text-muted text-sm">{messages.list.end(items.length)}</span>}
      </div>
    </>
  );
}
