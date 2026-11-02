"use client";

import { useEffect, useState } from "react";
import type { PokemonSummary } from "@/types/pokemon";

interface State {
  key: string;
  results: PokemonSummary[];
  failed: boolean;
}

/** Loads summaries for a list of slugs from our own API route (order preserved). */
export function usePokemonSummaries(names: string[]) {
  const key = names.join(",");
  const [state, setState] = useState<State>({ key: "", results: [], failed: false });

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch(`/api/pokemon?names=${encodeURIComponent(key)}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<{ results: PokemonSummary[] }>;
      })
      .then((data) => setState({ key, results: data.results, failed: false }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ key, results: [], failed: true });
      });
    return () => controller.abort();
  }, [key]);

  const loading = key !== "" && state.key !== key;
  return {
    loading,
    failed: state.key === key && state.failed,
    results: key === "" || loading ? [] : state.results,
  };
}
