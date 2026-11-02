import { GENERATIONS, PAGE_SIZE } from "@/config/pokedex";
import {
  POKEMON_TYPES,
  type FormCategory,
  type PokemonSummary,
  type PokemonTypeName,
} from "@/types/pokemon";
import { matchesQuery, parseQuery } from "./search";

export type SortKey = "number" | "name";
export type SortDirection = "asc" | "desc";
export type ViewMode = "pages" | "scroll";
export type FormsFilter = "none" | "all" | FormCategory;

export interface PokedexFilters {
  q: string;
  types: PokemonTypeName[];
  generation?: number;
  forms: FormsFilter;
  sort: SortKey;
  order: SortDirection;
  page: number;
  view: ViewMode;
}

export const FORMS_FILTERS: FormsFilter[] = ["none", "all", "regional", "mega", "gmax", "other"];

type RawParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Reads untrusted `searchParams` into a safe, fully-defaulted filter object. */
export function parseFilters(params: RawParams): PokedexFilters {
  const typeList = (first(params.type) ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter((t): t is PokemonTypeName => (POKEMON_TYPES as readonly string[]).includes(t));
  const gen = Number(first(params.gen));
  const forms = first(params.forms) as FormsFilter | undefined;
  const page = Number(first(params.page));
  return {
    q: (first(params.q) ?? "").slice(0, 60),
    types: [...new Set(typeList)].slice(0, 2),
    generation: (GENERATIONS as readonly number[]).includes(gen) ? gen : undefined,
    forms: forms && FORMS_FILTERS.includes(forms) ? forms : "none",
    sort: first(params.sort) === "name" ? "name" : "number",
    order: first(params.order) === "desc" ? "desc" : "asc",
    page: Number.isInteger(page) && page > 0 ? page : 1,
    view: first(params.view) === "scroll" ? "scroll" : "pages",
  };
}

/** Serializes filters back into a query string, omitting defaults. */
export function filtersToSearchParams(filters: Partial<PokedexFilters>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.types?.length) params.set("type", filters.types.join(","));
  if (filters.generation) params.set("gen", String(filters.generation));
  if (filters.forms && filters.forms !== "none") params.set("forms", filters.forms);
  if (filters.sort && filters.sort !== "number") params.set("sort", filters.sort);
  if (filters.order === "desc") params.set("order", "desc");
  if (filters.view === "scroll") params.set("view", "scroll");
  if (filters.page && filters.page > 1 && filters.view !== "scroll")
    params.set("page", String(filters.page));
  return params;
}

export function filterPokemon(
  all: PokemonSummary[],
  filters: Pick<PokedexFilters, "q" | "types" | "generation" | "forms">,
): PokemonSummary[] {
  const query = parseQuery(filters.q);
  return all.filter((pokemon) => {
    if (!pokemon.isDefault) {
      if (filters.forms === "none") return false;
      if (filters.forms !== "all" && pokemon.form?.category !== filters.forms) return false;
    }
    if (filters.generation && pokemon.generation !== filters.generation) return false;
    if (!filters.types.every((type) => pokemon.types.some((t) => t === type))) return false;
    return matchesQuery(
      { name: `${pokemon.speciesName} ${pokemon.name}`, speciesId: pokemon.speciesId },
      query,
    );
  });
}

export function sortPokemon(
  list: PokemonSummary[],
  sort: SortKey,
  order: SortDirection,
): PokemonSummary[] {
  const direction = order === "desc" ? -1 : 1;
  return [...list].sort((a, b) => {
    const byName = a.name.localeCompare(b.name);
    const result = sort === "name" ? byName : a.speciesId - b.speciesId || a.id - b.id;
    return (result || byName) * direction;
  });
}

export type PageItem = number | "ellipsis";

export interface Pagination {
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  items: PageItem[];
}

/** Numbered page list with ellipses: `1 … 4 5 6 … 43`. Out-of-range pages are clamped. */
export function paginate(total: number, requestedPage: number, pageSize = PAGE_SIZE): Pagination {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Math.trunc(requestedPage) || 1), totalPages);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const wanted = new Set([1, totalPages, page - 1, page, page + 1]);
  const numbers = [...wanted].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const items: PageItem[] = [];
  numbers.forEach((n, index) => {
    const previous = numbers[index - 1];
    if (previous !== undefined && n - previous === 2) items.push(previous + 1);
    else if (previous !== undefined && n - previous > 2) items.push("ellipsis");
    items.push(n);
  });
  return { page, totalPages, total, from, to, items };
}
