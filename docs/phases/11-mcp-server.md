# Phase 11 — MCP server

## Goal

Learn MCP end to end, from the protocol to daily use in Claude Code. The phase exposes the Pokédex
core as a local stdio MCP server, with no business rule duplicated from the web app. HTTP transport,
server auth and registry publishing are out of scope (`project-goal.md` §12).

## What was built

- `src/mcp/create-server.ts`: `McpServer` with name, version and `instructions`, registering 6
  tools, 2 resources and 2 prompts. Dependencies are injected (`McpDeps`), so tests pass a
  fixture-backed service.
- `src/mcp/server.ts`: the stdio entry point (`yarn mcp`). It shuts down cleanly on `SIGINT`,
  `SIGTERM` and stdin closing.
- Tools: `search_pokemon`, `get_pokemon`, `get_type_matchups`, `get_evolution_chain`,
  `analyze_team`, `simulate_battle`. Each is read-only and has Zod input/output schemas, a compact
  text result plus `structuredContent`, and `isError` results with suggestions for unknown names.
- Resources: `pokedex://types` (static) and `pokemon://{name}` (template with name completion).
- Prompts: `build-team` (`style`, `generation`) and `explain-matchup` (`attacker`, `defender`), with
  argument completion.
- Core additions, reusable by the app: `toSlug`, `levenshtein` and `suggestNames` in
  `lib/search.ts`; `attackMatchups` and `offensiveGaps` in `lib/type-effectiveness.ts`;
  `toBattlePokemon` in `lib/battle/team.ts`.
- `.mcp.json` (project scope), `yarn mcp:inspect` (MCP Inspector), and
  [`docs/guides/mcp.md`](../guides/mcp.md).
- Guards: ESLint `no-console` (only `error`/`warn`) and `no-restricted-imports` (no `next/*`) in
  `src/mcp/` and the core; `config.test.ts` also fails on `console.log` or `process.stdout.write`
  there.

## Concepts (what, why here, trade-off)

### Client, server and JSON-RPC 2.0

- **What it is:** the host (Claude Code) runs one MCP _client_ per _server_. They exchange JSON-RPC
  2.0 messages: requests with an `id` (`tools/call`), responses with the same `id`, and
  notifications without one (`notifications/initialized`).
- **Why here:** it explains the shape of everything else. A tool call is just
  `{"method":"tools/call","params":{"name":"get_pokemon","arguments":{"name":"gengar"}}}`.
- **Trade-off:** a plain, inspectable protocol. You can drive the server with `printf … | yarn mcp`,
  which is how it was first tested. The cost is that nothing protects the stream from stray output
  (see stdio below).

### Lifecycle and capabilities

- **What it is:** the client sends `initialize` (protocol version, its capabilities, client info).
  The server answers with its own capabilities (`tools`, `resources`, `prompts`, `completions`),
  server info and optional `instructions`. Then the client sends `notifications/initialized`, and
  only after that the real calls.
- **Why here:** capabilities are derived from what we register. Registering a prompt is what makes
  the server announce `prompts`. `instructions` is a short manual the client can put in the model's
  context ("names accept slugs, display names or numbers…").
- **Trade-off:** none for us. Version negotiation is handled by the SDK.

### Transports: stdio vs Streamable HTTP

- **What it is:** stdio means the client spawns the server as a child process and talks through its
  stdin/stdout, one JSON message per line. Streamable HTTP is a long-running server at a URL
  (POST for requests, optional SSE stream for server messages).
- **Why stdio here:** the server is personal and local. There is no port, no auth, and no deploy.
  The process lives as long as the Claude Code session.
- **Trade-off:** every user needs the repo and `node_modules`. Exposing it over HTTP from the
  deployed app (`/api/mcp`) is listed in §12 for later.

### The three primitives

- **What it is:** _tools_ are chosen by the model (actions with parameters). _Resources_ are
  addressable data the user or client attaches (`@pokedex:pokemon://pikachu`). _Prompts_ are
  conversation templates the user starts (`/mcp__pokedex__build-team`).
- **Why here:** the same data is offered three ways. `get_pokemon` and `pokemon://{name}` share one
  formatter (`pokemonText`). The prompts only orchestrate tools; they hold no Pokédex knowledge.
- **Trade-off:** resources and prompts depend on client support (Claude Code supports both). Tools
  are the part every client has.

### Designing tools for a model

- **What it is:** the model picks a tool from its name and description only, and pays for every
  token of the result.
- **Why here:** descriptions say _when_ to use the tool and what it doesn't do ("takes types, not
  Pokémon: call get_pokemon first"). Results are one fact per line with a hard cap: `limit ≤ 25`, and
  the battle log keeps only knockouts and switches, never the 50+ raw attacks. Tests assert the text
  stays under 4,000 characters. Types carry the slug the tools accept plus the Portuguese label.
- **Trade-off:** returning both text and `structuredContent` sends some data twice. Clients that
  read structured output get typed fields; others still get readable text. The duplication is small
  because the text is a summary, not the JSON.

### Errors as results

- **What it is:** a protocol error (JSON-RPC `error`) means "the call itself was wrong". A tool
  result with `isError: true` means "the call worked, and here is what went wrong", and the model
  sees it.
- **Why here:** `Pokémon "garchompp" not found. Did you mean: garchomp?` lets the model retry on its
  own. Unknown names in a team are all reported at once. The SDK already turns Zod input errors and
  thrown exceptions (PokeAPI down) into `isError` results. Resources are different: an unknown
  `pokemon://` URI is a protocol error (`-32002`, resource not found), because no model is waiting
  to self-correct.
- **Trade-off:** suggestions need the whole index (one cached call). `suggestNames` prefers
  substrings, then edit distance up to a third of the length, so `xyz` suggests nothing rather than
  something random.

## Decisions

| Decision                                | Alternatives considered                                | Why                                                                                                  |
| --------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `@modelcontextprotocol/sdk` 1.x         | The split v2 packages (`@modelcontextprotocol/server`) | The plan's choice; one package has server, client and `InMemoryTransport`. Both are maintained.      |
| `.mcp.json` runs `node --import tsx`    | `yarn mcp`, `cmd /c yarn mcp`                          | `yarn` is a `.cmd` shim on Windows; `cmd /c` breaks macOS/Linux. `node` works everywhere.            |
| `simulate_battle` via `toBattlePokemon` | Only Pokémon in the gym's battle pool                  | Any Pokémon or form can fight. It is checked against the pool snapshot (same fighter, same numbers). |
| `pokemon://{name}` not listed           | List all 1,300+ URIs                                   | A huge `resources/list` for every client; name completion covers discovery.                          |
| Dependencies injected into the server   | Module-level singleton                                 | Tests run the real server on fixtures through `InMemoryTransport`, never the PokeAPI.                |
| Prompts and descriptions in English     | Portuguese                                             | They are code (AGENTS.md). Prompts ask the model to _answer_ in Brazilian Portuguese, like the UI.   |

## Gotchas

- **Stdout belongs to the protocol.** One `console.log` anywhere in the server's import graph,
  including the core, corrupts the stream, and the client usually just shows "failed to connect".
  That's why the lint rule and the architecture test cover `src/lib` and `src/server` too, not just
  `src/mcp`.
- A server with an `outputSchema` must return matching `structuredContent` on success, or the SDK
  replaces the result with an error. Error results (`isError`) skip that check.
- `z.record(z.enum(STAT_NAMES), …)` in Zod 4 is exhaustive: every stat must be present, which is
  what we want for the `stats` output.
- `toSlug` must drop apostrophes instead of spacing them (`Farfetch'd` → `farfetchd`), unlike the
  search normalizer, and map `♀`/`♂` to `-f`/`-m`.
- Yarn 4 prints nothing to stdout for `yarn mcp`, so the script is safe for the Inspector. A package
  manager that prints a banner would break stdio. Another reason `.mcp.json` calls `node` directly.

## How it was verified

- `src/mcp/server.test.ts` (28 tests): a real SDK `Client` over `InMemoryTransport` lists the
  tools, resources and prompts. It calls every tool, checks that invalid input and unknown names are
  `isError`, that results stay under the size limit, that a battle replays from its seed, and that
  resource and prompt completion work.
- Raw JSON-RPC over stdio against the real PokeAPI: `initialize`, then six tool calls in ~3.6 s with
  zero non-JSON lines on stdout. The server exits with code 0 when stdin closes.
- MCP Inspector CLI: `tools/call get_type_matchups` returns text and `structuredContent`.
- In Claude Code (to do after the merge): `/mcp` shows the server connected, and real questions
  chain tools (search → details → team analysis). Adjust tool names and descriptions wherever the
  model picks the wrong tool, and note what changed here.
