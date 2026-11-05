import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MemoryCache } from "@/server/pokeapi/cache";
import { createPokeApiClient } from "@/server/pokeapi/client";
import { createPokedexService } from "@/server/pokedex/service";
import packageJson from "../../package.json";
import type { McpDeps } from "./context";
import { registerPrompts } from "./prompts";
import { registerResources } from "./resources";
import { registerTools } from "./tools";

export const SERVER_NAME = "pokedex";

const INSTRUCTIONS = `Pokédex data (every generation, alternative forms included) from PokeAPI, plus the
type chart and the app's simplified battle engine. Names accept slugs ("mr-mime"), display names
("Mr. Mime") or numbers ("25"); types are English slugs ("fire"). When a name is unknown, the error
suggests close matches: retry with one of them. Labels in the results are Portuguese (the app's UI
language).`;

/** Plain Node: the same core as the web app, with an in-memory cache instead of Next's. */
export function defaultDeps(): McpDeps {
  return { pokedex: createPokedexService(createPokeApiClient({ cache: new MemoryCache() })) };
}

/** Builds the server with every tool, resource and prompt; the caller picks the transport. */
export function createPokedexMcpServer(deps: McpDeps = defaultDeps()): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, title: "Pokédex", version: packageJson.version },
    { instructions: INSTRUCTIONS },
  );
  registerTools(server, deps);
  registerResources(server, deps);
  registerPrompts(server, deps);
  return server;
}
