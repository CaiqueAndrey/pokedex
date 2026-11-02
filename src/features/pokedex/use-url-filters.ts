"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { filtersToSearchParams, parseFilters, type PokedexFilters } from "@/lib/filters";

/** Reads Pokédex filters from the URL and writes changes back (push or replace). */
export function useUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseFilters(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );

  const update = useCallback(
    (changes: Partial<PokedexFilters>, mode: "push" | "replace" = "push") => {
      // Filters only make sense on the list page; from anywhere else start from scratch.
      const base = pathname === "/" ? filters : parseFilters({});
      const next = { ...base, page: 1, ...changes };
      const query = filtersToSearchParams(next).toString();
      const url = query ? `/?${query}` : "/";
      if (mode === "replace") router.replace(url);
      else router.push(url);
    },
    [filters, pathname, router],
  );

  return { filters, update };
}
