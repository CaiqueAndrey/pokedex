import { ResourceTemplate, type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError } from "@modelcontextprotocol/sdk/types.js";
import { TYPE_LABELS } from "@/config/messages";
import { toSlug } from "@/lib/search";
import { attackMatchups } from "@/lib/type-effectiveness";
import { POKEMON_TYPES } from "@/types/pokemon";
import { resolvePokemon, type McpDeps } from "./context";
import { pokemonText } from "./format";

/** JSON-RPC code the MCP spec uses for an unknown resource. */
export const RESOURCE_NOT_FOUND = -32002;

const COMPLETION_LIMIT = 20;

const slugs = (types: readonly string[]) => (types.length ? types.join(", ") : "—");

export function registerResources(server: McpServer, { pokedex }: McpDeps) {
  server.registerResource(
    "pokemon",
    // Not listed (1300+ entries would flood the client); the name completes instead.
    new ResourceTemplate("pokemon://{name}", {
      list: undefined,
      complete: {
        name: async (value) => {
          const prefix = toSlug(value);
          const all = await pokedex.listPokemon();
          return all
            .filter((p) => p.name.startsWith(prefix))
            .slice(0, COMPLETION_LIMIT)
            .map((p) => p.name);
        },
      },
    }),
    {
      title: "Pokémon",
      description: "The same card get_pokemon returns, as a document: pokemon://pikachu.",
      mimeType: "text/markdown",
    },
    async (uri, { name }) => {
      const raw = decodeURIComponent(Array.isArray(name) ? (name[0] ?? "") : (name ?? ""));
      const resolved = await resolvePokemon(pokedex, [raw]);
      const [detail] = resolved.ok ? resolved.details : [];
      if (!resolved.ok || !detail) {
        throw new McpError(
          RESOURCE_NOT_FOUND,
          resolved.ok ? `Not found: ${raw}` : resolved.message,
        );
      }
      return {
        contents: [{ uri: uri.href, mimeType: "text/markdown", text: pokemonText(detail) }],
      };
    },
  );

  server.registerResource(
    "types",
    "pokedex://types",
    {
      title: "Type chart",
      description:
        "The 18 types (slug and Portuguese label) and what each one hits as an attacking type.",
      mimeType: "text/markdown",
    },
    async (uri) => {
      const relations = await pokedex.getTypeRelations();
      const rows = POKEMON_TYPES.map((type) => {
        const { superEffective, notVeryEffective, noEffect } = attackMatchups(type, relations);
        return `| ${type} | ${TYPE_LABELS[type]} | ${slugs(superEffective)} | ${slugs(notVeryEffective)} | ${slugs(noEffect)} |`;
      });
      const text = [
        "# Type chart (attacking type → defending type)",
        "",
        "| Type | Label (pt-BR) | 2× against | ½× against | 0× against |",
        "| --- | --- | --- | --- | --- |",
        ...rows,
        "",
        "Dual types multiply: a 2× and a ½× cancel out; 2× on both types is 4×.",
      ].join("\n");
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text }] };
    },
  );
}
