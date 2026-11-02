import { NextResponse } from "next/server";
import { z } from "zod";
import { PAGE_SIZE } from "@/config/pokedex";
import { filterPokemon, paginate, parseFilters, sortPokemon } from "@/lib/filters";
import { getPokedex } from "@/server/pokedex/next-cache";

// Lets client components (favorites, team, pickers, infinite scroll) read summaries from our own
// server instead of the browser ever talking to the PokeAPI.
const querySchema = z.object({
  names: z.string().max(4000).optional(),
  q: z.string().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(24).default(8),
});

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  const { names, q, limit } = parsed.data;

  try {
    const all = await getPokedex().listPokemon();

    // Infinite scroll: same filters as the list page, one page at a time.
    if (params.list !== undefined) {
      const filters = parseFilters(params);
      const sorted = sortPokemon(filterPokemon(all, filters), filters.sort, filters.order);
      const pagination = paginate(sorted.length, filters.page);
      const start = (pagination.page - 1) * PAGE_SIZE;
      return NextResponse.json({
        results: filters.page > pagination.totalPages ? [] : sorted.slice(start, start + PAGE_SIZE),
        hasMore: filters.page < pagination.totalPages,
      });
    }

    if (names !== undefined) {
      const byName = new Map(all.map((p) => [p.name, p]));
      const results = names
        .split(",")
        .slice(0, 100)
        .flatMap((name) => byName.get(name) ?? []);
      return NextResponse.json({ results });
    }
    const matches = sortPokemon(
      filterPokemon(all, { q: q ?? "", types: [], generation: undefined, forms: "all" }),
      "number",
      "asc",
    );
    return NextResponse.json({ results: matches.slice(0, limit) });
  } catch {
    return NextResponse.json({ error: "Upstream unavailable" }, { status: 502 });
  }
}
