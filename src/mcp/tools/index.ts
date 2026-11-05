import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpDeps } from "../context";
import { registerAnalyzeTeam } from "./analyze-team";
import { registerGetEvolutionChain } from "./get-evolution-chain";
import { registerGetPokemon } from "./get-pokemon";
import { registerGetTypeMatchups } from "./get-type-matchups";
import { registerSearchPokemon } from "./search-pokemon";
import { registerSimulateBattle } from "./simulate-battle";

export function registerTools(server: McpServer, deps: McpDeps) {
  registerSearchPokemon(server, deps);
  registerGetPokemon(server, deps);
  registerGetTypeMatchups(server, deps);
  registerGetEvolutionChain(server, deps);
  registerAnalyzeTeam(server, deps);
  registerSimulateBattle(server, deps);
}
