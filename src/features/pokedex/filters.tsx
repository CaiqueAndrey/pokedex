"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Select } from "@/components/ui/select";
import { FORM_CATEGORY_LABELS, generationLabel, messages } from "@/config/messages";
import { GENERATIONS } from "@/config/pokedex";
import { TYPE_STYLES } from "@/config/pokemon-types";
import { FORMS_FILTERS, type FormsFilter, type SortDirection, type SortKey } from "@/lib/filters";
import { POKEMON_TYPES, type PokemonTypeName } from "@/types/pokemon";
import { useUrlFilters } from "./use-url-filters";

const m = messages.filters;

export function Filters({ hasActiveFilters }: { hasActiveFilters: boolean }) {
  const { filters, update } = useUrlFilters();

  function toggleType(type: PokemonTypeName) {
    const selected = filters.types.includes(type);
    if (selected) return update({ types: filters.types.filter((t) => t !== type) });
    // At most two types: a new pick replaces the oldest one.
    update({ types: [...filters.types, type].slice(-2) });
  }

  return (
    <details
      className="group border-border bg-surface mb-6 rounded-2xl border"
      open={hasActiveFilters}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <SlidersHorizontal aria-hidden className="size-4" />
        {m.show}
        {hasActiveFilters && (
          <span className="bg-primary-600 size-2 rounded-full" aria-label="ativos" />
        )}
      </summary>
      <div className="border-border grid gap-5 border-t p-4">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            {m.type} <span className="text-muted font-normal">· {m.typeHint}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {POKEMON_TYPES.map((type) => {
              const style = TYPE_STYLES[type];
              const pressed = filters.types.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => toggleType(type)}
                  className={cn(
                    "min-h-11 rounded-full border-2 px-4 text-sm font-semibold transition-opacity",
                    pressed
                      ? "border-foreground ring-foreground/30 ring-2"
                      : "hover:border-border border-transparent",
                  )}
                  style={{ backgroundColor: style.color, color: style.textColor }}
                >
                  {style.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-sm font-medium">
            {m.generation}
            <Select
              value={filters.generation ?? ""}
              onChange={(event) =>
                update({ generation: event.target.value ? Number(event.target.value) : undefined })
              }
            >
              <option value="">{m.allGenerations}</option>
              {GENERATIONS.map((generation) => (
                <option key={generation} value={generation}>
                  {generationLabel(generation)}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            {m.forms}
            <Select
              value={filters.forms}
              onChange={(event) => update({ forms: event.target.value as FormsFilter })}
            >
              {FORMS_FILTERS.map((forms) => (
                <option key={forms} value={forms}>
                  {FORM_CATEGORY_LABELS[forms]}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            {m.sort}
            <Select
              value={filters.sort}
              onChange={(event) => update({ sort: event.target.value as SortKey })}
            >
              <option value="number">{m.sortNumber}</option>
              <option value="name">{m.sortName}</option>
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            {m.order}
            <Select
              value={filters.order}
              onChange={(event) => update({ order: event.target.value as SortDirection })}
            >
              <option value="asc">{m.asc}</option>
              <option value="desc">{m.desc}</option>
            </Select>
          </label>
        </div>

        {hasActiveFilters && (
          <div>
            <Button
              variant="secondary"
              onClick={() =>
                update({
                  q: "",
                  types: [],
                  generation: undefined,
                  forms: "none",
                  sort: "number",
                  order: "asc",
                })
              }
            >
              {m.clear}
            </Button>
          </div>
        )}
      </div>
    </details>
  );
}
