# MCP server

The Pokédex ships a [Model Context Protocol](https://modelcontextprotocol.io) server, so an AI
client (Claude Code, Claude Desktop, an IDE) can use the same data and rules as the web app. It
runs locally in plain Node and talks over **stdio**. It reuses the framework-independent core
(`src/server/pokedex`, `src/lib`) with an in-memory cache in place of Next's.

```text
Claude Code ──JSON-RPC over stdio──▶ src/mcp/server.ts ──▶ core (service, lib) ──▶ PokeAPI
```

## Run it

```bash
yarn mcp            # starts the server; it waits for a client on stdin (Ctrl+C to stop)
yarn mcp:inspect    # opens the MCP Inspector (web UI) connected to the server
```

`yarn mcp` prints one line to **stderr** (`[pokedex] MCP server running on stdio`) and nothing to
stdout. Stdout carries only protocol messages.

The Inspector also has a CLI mode, handy for a quick check without a browser:

```bash
yarn mcp-inspector --cli tsx src/mcp/server.ts --method tools/list
yarn mcp-inspector --cli tsx src/mcp/server.ts --method tools/call \
  --tool-name get_pokemon --tool-arg name=gengar
```

## Use it in Claude Code

The server is registered for the project in [`.mcp.json`](../../.mcp.json), which is versioned:

```json
{
  "mcpServers": {
    "pokedex": {
      "type": "stdio",
      "command": "node",
      "args": ["--import", "tsx", "src/mcp/server.ts"]
    }
  }
}
```

1. Run `yarn install` (the server needs `tsx` and the SDK from `node_modules`).
2. Open Claude Code at the repository root. It asks once whether to trust the project's MCP
   servers. Approve `pokedex`.
3. Run `/mcp`: `pokedex` should show as connected, with 6 tools, 2 resources and 2 prompts.

To register it again (or in another scope):
`claude mcp add pokedex --scope project -- node --import tsx src/mcp/server.ts`.

> Why `node --import tsx` and not `yarn mcp`? On Windows, `yarn` is a `.cmd` shim, which Claude
> Code can only start through `cmd /c`, and that breaks on macOS/Linux. `node` is a real executable
> on every OS, so one `.mcp.json` works for everyone. The relative path assumes Claude Code runs from
> the repository root.

## What it exposes

### Tools (the model decides when to call them)

All tools are read-only (`readOnlyHint: true`), validate input with Zod, and return a compact text
summary plus `structuredContent` that matches their `outputSchema`.

| Tool                  | Input                                                                    | Returns                                                      |
| --------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `search_pokemon`      | `query?`, `types?` (≤ 2), `generation?`, `includeForms?`, `limit` (≤ 25) | `#id slug — name — types` lines and the total match count    |
| `get_pokemon`         | `name` (slug, name, number or form: `charizard-mega-x`)                  | types, base stats, abilities, height/weight, forms, entry    |
| `get_type_matchups`   | `types` (1 or 2)                                                         | 4×/2× weaknesses, resistances, immunities; offense per type  |
| `get_evolution_chain` | `name`                                                                   | the whole family, branches included, with triggers           |
| `analyze_team`        | `names` (1–6)                                                            | threats, shared weaknesses, unanswered threats, offense gaps |
| `simulate_battle`     | `team`, `opponent` (1–6 each), `seed?`                                   | winner, HP/damage/KOs per member, MVPs, key events, seed     |

Errors the model can fix come back as results with `isError: true`, not as protocol errors.
For example: `Pokémon "garchompp" not found. Did you mean: garchomp?`

`simulate_battle` is the gym-mode engine (`src/lib/battle`) with its simplified rules: level 50, no
moves or abilities, each Pokémon attacks with its best own type. The same teams and seed always give
the same result.

### Resources (the user attaches them)

| URI                | Content                                                         |
| ------------------ | --------------------------------------------------------------- |
| `pokedex://types`  | the 18 types (slug and Portuguese label) and what each one hits |
| `pokemon://{name}` | the `get_pokemon` card as Markdown, e.g. `pokemon://pikachu`    |

In Claude Code, type `@` to mention a resource. `pokemon://{name}` is a template: it is not listed
(1,300+ entries), but the client can autocomplete the name.

### Prompts (the user starts them)

| Prompt            | Arguments                                                                 | In Claude Code                   |
| ----------------- | ------------------------------------------------------------------------- | -------------------------------- |
| `build-team`      | `style?` (balanced, offensive, defensive, fast, mono-type), `generation?` | `/mcp__pokedex__build-team`      |
| `explain-matchup` | `attacker`, `defender`                                                    | `/mcp__pokedex__explain-matchup` |

Both tell the model to work through the tools instead of answering from memory, and to answer in
Brazilian Portuguese.

## Questions to try

- "Quais as fraquezas de um time com Charizard, Gyarados e Pikachu?" (`analyze_team`)
- "Quais Pokémon Dragão da 9ª geração existem? Qual deles tem mais ataque?" (`search_pokemon` →
  `get_pokemon` for each)
- "Como o Eevee evolui para Sylveon?" (`get_evolution_chain`)
- "Garchomp ou Tyranitar: quem vence um contra um?" (`simulate_battle`, a few seeds)
- "Monte um time da 1ª geração que aguente o Ginásio de Pewter" (`/mcp__pokedex__build-team`)

## Develop

- Code lives in `src/mcp/`: `create-server.ts` builds the server and `server.ts` is the stdio entry
  point. `tools/` has one file per tool, plus `resources.ts`, `prompts.ts` and `format.ts` for
  shared text formatting.
- Tests (`src/mcp/server.test.ts`) connect a real SDK `Client` to the server through
  `InMemoryTransport`, with the PokeAPI fixtures. They never hit the real API.
- **Never write to stdout** from `src/mcp/` or the core: `console.log` there corrupts the protocol.
  ESLint (`no-console`) and `src/config/config.test.ts` both enforce it. Use `console.error`.
- The SDK is `@modelcontextprotocol/sdk` 1.x (`McpServer.registerTool` / `registerResource` /
  `registerPrompt`). Its API changes between versions, so read the installed version's types
  before upgrading.
