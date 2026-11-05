import { suggestNames, toSlug } from "@/lib/search";
import type { PokedexService } from "@/server/pokedex/service";
import type { PokemonDetail } from "@/types/pokemon";

/** What the MCP server needs from the outside world: injected so tests can use fixtures. */
export interface McpDeps {
  pokedex: PokedexService;
}

export type Resolved = { ok: true; details: PokemonDetail[] } | { ok: false; message: string };

/** `"pikachu" not found. Did you mean: pichu, pikipek?` */
async function notFoundMessage(pokedex: PokedexService, name: string): Promise<string> {
  const all = await pokedex.listPokemon();
  const suggestions = suggestNames(
    name,
    all.map((p) => p.name),
  );
  const hint = suggestions.length
    ? ` Did you mean: ${suggestions.join(", ")}?`
    : " Use search_pokemon to find the right name.";
  return `Pokémon "${name}" not found.${hint}`;
}

/**
 * Looks up every name (slug, display name or Pokédex number), in order. Unknown names are all
 * reported at once, with suggestions, so the model can fix the call in one go.
 */
export async function resolvePokemon(
  pokedex: PokedexService,
  names: readonly string[],
): Promise<Resolved> {
  const details = await Promise.all(
    names.map((name) => {
      const slug = toSlug(name);
      return slug ? pokedex.getPokemonDetail(slug) : Promise.resolve(null);
    }),
  );
  const missing = names.filter((_, i) => !details[i]);
  if (missing.length) {
    const messages = await Promise.all(missing.map((name) => notFoundMessage(pokedex, name)));
    return { ok: false, message: messages.join("\n") };
  }
  return { ok: true, details: details.filter((d): d is PokemonDetail => d !== null) };
}
