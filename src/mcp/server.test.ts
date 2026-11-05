import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createFixtureClient } from "@/server/pokeapi/fixtures";
import { createPokedexService } from "@/server/pokedex/service";
import { createPokedexMcpServer } from "./create-server";
import { SEARCH_LIMIT_MAX } from "./tools/search-pokemon";

/** Every tool answer must stay small: it lands in the model's context. */
const MAX_TEXT_CHARS = 4000;

const server = createPokedexMcpServer({
  pokedex: createPokedexService(createFixtureClient()),
});
const client = new Client({ name: "test-client", version: "1.0.0" });

beforeAll(async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
});

afterAll(async () => {
  await client.close();
  await server.close();
});

async function call(name: string, args: Record<string, unknown>) {
  const result = (await client.callTool({ name, arguments: args })) as CallToolResult;
  const text = result.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
  return { result, text, data: result.structuredContent as Record<string, unknown> };
}

async function readText(uri: string) {
  const { contents } = await client.readResource({ uri });
  return contents.map((c) => ("text" in c ? c.text : "")).join("\n");
}

describe("server", () => {
  it("introduces itself with instructions", () => {
    expect(client.getServerVersion()?.name).toBe("pokedex");
    expect(client.getInstructions()).toContain("suggests close matches");
  });

  it("lists every tool as read-only, with input and output schemas", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "analyze_team",
      "get_evolution_chain",
      "get_pokemon",
      "get_type_matchups",
      "search_pokemon",
      "simulate_battle",
    ]);
    for (const tool of tools) {
      expect(tool.annotations?.readOnlyHint).toBe(true);
      expect(tool.description?.length).toBeGreaterThan(40);
      expect(tool.outputSchema).toBeDefined();
    }
  });
});

describe("search_pokemon", () => {
  it("filters by type and generation, sorted by number", async () => {
    const { result, text, data } = await call("search_pokemon", {
      types: ["fire"],
      generation: 1,
    });
    expect(result.isError).toBeFalsy();
    const names = (data.results as { name: string }[]).map((r) => r.name);
    expect(names).toEqual([
      "charmander",
      "charmeleon",
      "charizard",
      "vulpix",
      "ninetales",
      "flareon",
    ]);
    expect(text).toContain("#0006 charizard — Charizard — fire (Fogo) / flying (Voador)");
  });

  it("caps the list but reports the total", async () => {
    const { data, text } = await call("search_pokemon", { limit: 5 });
    expect(data.results).toHaveLength(5);
    expect(data.total).toBe(63);
    expect(text).toContain("showing the first 5");
  });

  it("includes forms only when asked", async () => {
    const without = await call("search_pokemon", { query: "raichu" });
    const withForms = await call("search_pokemon", { query: "raichu", includeForms: true });
    expect(without.data.total).toBe(1);
    expect(withForms.text).toContain(
      "raichu-alola — Raichu (Alola) — electric (Elétrico) / psychic",
    );
  });

  it("answers an empty search without an error", async () => {
    const { result, text } = await call("search_pokemon", { query: "zzzz" });
    expect(result.isError).toBeFalsy();
    expect(text).toBe("No Pokémon match these filters.");
  });

  it("rejects invalid input as a tool error", async () => {
    const tooMany = await call("search_pokemon", { limit: SEARCH_LIMIT_MAX + 1 });
    expect(tooMany.result.isError).toBe(true);
    const badType = await call("search_pokemon", { types: ["fogo"] });
    expect(badType.result.isError).toBe(true);
    expect(badType.text).toMatch(/invalid/i);
  });
});

describe("get_pokemon", () => {
  it("returns a compact card", async () => {
    const { text, data } = await call("get_pokemon", { name: "Charizard" });
    expect(data).toMatchObject({
      number: 6,
      name: "charizard",
      types: [
        { slug: "fire", label: "Fogo" },
        { slug: "flying", label: "Voador" },
      ],
      statTotal: 534,
      stats: { hp: 78, speed: 100 },
    });
    expect(text).toContain("Other forms: charizard-mega-x (Mega X)");
    expect(text.length).toBeLessThan(MAX_TEXT_CHARS);
  });

  it("accepts numbers and forms", async () => {
    expect((await call("get_pokemon", { name: "#025" })).data.name).toBe("pikachu");
    const alola = await call("get_pokemon", { name: "raichu-alola" });
    expect(alola.data).toMatchObject({ number: 26, displayName: "Raichu (Alola)" });
  });

  it("turns an unknown name into an error with suggestions", async () => {
    const { result, text } = await call("get_pokemon", { name: "pikachuu" });
    expect(result.isError).toBe(true);
    expect(text).toBe('Pokémon "pikachuu" not found. Did you mean: pikachu?');
  });
});

describe("get_type_matchups", () => {
  it("groups defensive multipliers and lists offense", async () => {
    const { data, text } = await call("get_type_matchups", { types: ["fire", "flying"] });
    const slugs = (refs: unknown) => (refs as { slug: string }[]).map((r) => r.slug);
    const defense = data.defense as Record<string, unknown>;
    expect(slugs(defense.weak4)).toEqual(["rock"]);
    expect(slugs(defense.immune)).toEqual(["ground"]);
    expect(slugs(defense.resist4)).toEqual(["grass", "bug"]);
    expect(text).toContain("- 4× weak: rock (Pedra)");
    expect(text).toContain("Attacking with fire: 2× against grass (Planta), ice (Gelo)");
  });

  it("rejects repeated or too many types", async () => {
    expect((await call("get_type_matchups", { types: ["fire", "fire"] })).result.isError).toBe(
      true,
    );
    expect(
      (await call("get_type_matchups", { types: ["fire", "water", "grass"] })).result.isError,
    ).toBe(true);
  });
});

describe("get_evolution_chain", () => {
  it("flattens branches with their triggers", async () => {
    const { data, text } = await call("get_evolution_chain", { name: "eevee" });
    const stages = data.stages as { name: string; stage: number; trigger?: string }[];
    expect(stages[0]).toMatchObject({ name: "eevee", stage: 1 });
    expect(stages.filter((s) => s.stage === 2).map((s) => s.name)).toEqual(
      expect.arrayContaining(["vaporeon", "jolteon", "flareon", "espeon", "umbreon", "sylveon"]),
    );
    expect(stages.find((s) => s.name === "vaporeon")?.trigger).toBe("Water Stone");
    expect(text).toContain("- #0133 eevee ← this one");
  });

  it("uses the species chain for a form", async () => {
    const { text } = await call("get_evolution_chain", { name: "charizard-mega-x" });
    expect(text).toContain("  - #0005 charmeleon — Nível 16");
    expect(text).toContain("    - #0006 charizard — Nível 36 ← this one");
  });
});

describe("analyze_team", () => {
  it("finds shared weaknesses and gaps", async () => {
    const { data, text } = await call("analyze_team", {
      names: ["charizard", "butterfree", "beedrill"],
    });
    const slugs = (refs: unknown) => (refs as { slug: string }[]).map((r) => r.slug);
    // Rock hits all three (4× on Charizard) and nobody resists it.
    expect(slugs(data.sharedWeaknesses)).toEqual(["rock"]);
    expect(slugs(data.unanswered)).toContain("rock");
    expect((data.threats as { type: { slug: string } }[])[0]?.type.slug).toBe("rock");
    expect(text.length).toBeLessThan(MAX_TEXT_CHARS);
  });

  it("reports every unknown member at once", async () => {
    const { result, text } = await call("analyze_team", {
      names: ["pikachu", "charmandr", "bulbasuar"],
    });
    expect(result.isError).toBe(true);
    expect(text).toContain('"charmandr" not found. Did you mean: charmander');
    expect(text).toContain('"bulbasuar" not found. Did you mean: bulbasaur');
  });

  it("rejects more than six members", async () => {
    const { result } = await call("analyze_team", { names: Array(7).fill("pikachu") });
    expect(result.isError).toBe(true);
  });
});

describe("simulate_battle", () => {
  const battle = { team: ["blastoise"], opponent: ["charizard"], seed: "test" };

  it("is deterministic for a seed and favours the type advantage", async () => {
    const first = await call("simulate_battle", battle);
    const again = await call("simulate_battle", battle);
    expect(first.data).toEqual(again.data);
    expect(first.data).toMatchObject({ winner: "team", seed: "test", mvp: { team: "blastoise" } });
    expect(first.text).toContain("knocks out charizard (opponent) with water (2×");
  });

  it("returns the random seed it used", async () => {
    const { data } = await call("simulate_battle", { team: ["pikachu"], opponent: ["squirtle"] });
    expect(data.seed).toMatch(/^[0-9a-z]{6}$/);
    const replay = await call("simulate_battle", {
      team: ["pikachu"],
      opponent: ["squirtle"],
      seed: data.seed,
    });
    expect(replay.data).toEqual(data);
  });

  it("keeps a six-on-six log short", async () => {
    const team = ["venusaur", "charizard", "blastoise", "pikachu", "gengar", "nidoking"];
    const opponent = ["butterfree", "beedrill", "pidgeot", "raticate", "arbok", "sandslash"];
    const { data, text } = await call("simulate_battle", { team, opponent, seed: "six" });
    expect((data.team as unknown[]).length).toBe(6);
    expect((data.log as string[]).length).toBeLessThanOrEqual(30);
    expect(text.length).toBeLessThan(MAX_TEXT_CHARS);
  });

  it("reports unknown names from both sides", async () => {
    const { result, text } = await call("simulate_battle", {
      team: ["pikachuu"],
      opponent: ["mewtwoo"],
    });
    expect(result.isError).toBe(true);
    expect(text).toContain('"pikachuu" not found');
    expect(text).toContain('"mewtwoo" not found');
  });
});

describe("resources", () => {
  it("lists the type chart and the Pokémon template", async () => {
    const { resources } = await client.listResources();
    expect(resources.map((r) => r.uri)).toEqual(["pokedex://types"]);
    const { resourceTemplates } = await client.listResourceTemplates();
    expect(resourceTemplates.map((t) => t.uriTemplate)).toEqual(["pokemon://{name}"]);
  });

  it("reads the type chart", async () => {
    expect(await readText("pokedex://types")).toContain(
      "| electric | Elétrico | water, flying | electric, grass, dragon | ground |",
    );
  });

  it("reads a Pokémon and fails clearly for an unknown one", async () => {
    expect(await readText("pokemon://gengar")).toContain(
      "#0094 gengar — Gengar — ghost (Fantasma) / poison",
    );
    await expect(client.readResource({ uri: "pokemon://gengarr" })).rejects.toThrow(
      /Did you mean: gengar/,
    );
  });

  it("completes Pokémon names in the URI", async () => {
    const { completion } = await client.complete({
      ref: { type: "ref/resource", uri: "pokemon://{name}" },
      argument: { name: "name", value: "chari" },
    });
    expect(completion.values).toEqual([
      "charizard",
      "charizard-mega-x",
      "charizard-mega-y",
      "charizard-gmax",
    ]);
  });
});

describe("prompts", () => {
  it("lists both prompts with their arguments", async () => {
    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name)).toEqual(["build-team", "explain-matchup"]);
    expect(prompts[1]?.arguments?.map((a) => [a.name, a.required])).toEqual([
      ["attacker", true],
      ["defender", true],
    ]);
  });

  it("builds a team prompt that points to the tools", async () => {
    const { messages } = await client.getPrompt({
      name: "build-team",
      arguments: { style: "offensive", generation: "1" },
    });
    const text = messages[0]?.content.type === "text" ? messages[0].content.text : "";
    expect(text).toContain("Style: offensive.");
    expect(text).toContain("generation 1");
    expect(text).toContain("analyze_team");
  });

  it("completes prompt arguments", async () => {
    const style = await client.complete({
      ref: { type: "ref/prompt", name: "build-team" },
      argument: { name: "style", value: "o" },
    });
    expect(style.completion.values).toEqual(["offensive"]);
    const attacker = await client.complete({
      ref: { type: "ref/prompt", name: "explain-matchup" },
      argument: { name: "attacker", value: "pika" },
    });
    expect(attacker.completion.values).toEqual(["pikachu"]);
  });
});
