"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { displayName, formatNumber } from "@/lib/format";
import { spriteUrl } from "@/lib/sprites";
import type { PokemonSummary } from "@/types/pokemon";

/** Search-as-you-type picker backed by /api/pokemon. */
export function PokemonPicker({
  label,
  placeholder,
  onSelect,
  disabled,
}: {
  label: string;
  placeholder?: string;
  onSelect: (pokemon: PokemonSummary) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ query: string; items: PokemonSummary[] }>({
    query: "",
    items: [],
  });

  useEffect(() => {
    const text = query.trim();
    if (!text) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/pokemon?q=${encodeURIComponent(text)}&limit=6`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : { results: [] }))
        .then((data: { results: PokemonSummary[] }) =>
          setResults({ query: text, items: data.results }),
        )
        .catch(() => undefined);
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const visible = query.trim() && results.query === query.trim() ? results.items : [];

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        type="search"
        autoComplete="off"
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => setQuery(event.target.value)}
      />
      {visible.length > 0 && (
        <ul className="border-border bg-background absolute z-20 mt-1 w-full overflow-hidden rounded-xl border shadow-lg">
          {visible.map((pokemon) => (
            <li key={pokemon.name}>
              <button
                type="button"
                onClick={() => {
                  onSelect(pokemon);
                  setQuery("");
                }}
                className="hover:bg-border/60 flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm"
              >
                <Image
                  src={spriteUrl(pokemon.id, "default")}
                  alt=""
                  width={40}
                  height={40}
                  unoptimized
                  className="size-10"
                />
                <span className="font-medium">{displayName(pokemon)}</span>
                <span className="text-muted ml-auto">{formatNumber(pokemon.speciesId)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
