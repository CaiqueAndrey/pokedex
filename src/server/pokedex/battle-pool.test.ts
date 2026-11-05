import { describe, expect, it, vi } from "vitest";
import {
  createGamePoolLoader,
  fetchBattlePool,
  mapPoolResponse,
  poolMaxSpeciesId,
  snapshotGamePool,
  snapshotLegendaries,
  snapshotPool,
} from "./battle-pool";

const stat = (name: string, base_stat: number) => ({ base_stat, stat: { name } });

const raw = {
  data: {
    pokemonspecies: [
      {
        id: 6,
        name: "charizard",
        evolution_chain_id: 2,
        is_baby: false,
        pokemons: [
          {
            id: 6,
            pokemonstats: [
              stat("hp", 78),
              stat("attack", 84),
              stat("defense", 78),
              stat("special-attack", 109),
              stat("special-defense", 85),
              stat("speed", 100),
            ],
            pokemontypes: [
              { slot: 2, type: { name: "flying" } },
              { slot: 1, type: { name: "fire" } },
            ],
          },
        ],
      },
    ],
  },
};

describe("battle pool", () => {
  it("maps the GraphQL response into battle Pokémon (types in slot order, BST)", () => {
    expect(mapPoolResponse(raw)).toEqual([
      {
        id: 6,
        name: "charizard",
        family: 2,
        baby: false,
        types: ["fire", "flying"],
        stats: {
          hp: 78,
          attack: 84,
          defense: 78,
          "special-attack": 109,
          "special-defense": 85,
          speed: 100,
        },
        bst: 534,
      },
    ]);
  });

  it("asks for generations 1–4", () => {
    expect(poolMaxSpeciesId()).toBe(493);
  });

  it("posts the query and validates the response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(raw)));
    const pool = await fetchBattlePool({ endpoint: "http://gql.test", fetch: fetchMock });
    expect(pool[0]?.name).toBe("charizard");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body)).variables).toEqual({ maxId: 493, legendary: false });

    const bad = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {} })));
    await expect(fetchBattlePool({ fetch: bad })).rejects.toThrow(/Unexpected GraphQL shape/);
  });

  it("asks for legendaries separately and flags them", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(raw)));
    const pool = await fetchBattlePool({ fetch: fetchMock, legendary: true });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).variables).toEqual({ maxId: 493, legendary: true });
    expect(pool[0]?.legendary).toBe(true);
  });

  it("has a legendary snapshot: generations 1–4, no mythicals", () => {
    const legendaries = snapshotLegendaries();
    expect(legendaries).toHaveLength(26);
    expect(legendaries.every((p) => p.legendary)).toBe(true);
    const names = legendaries.map((p) => p.name);
    expect(names).toEqual(expect.arrayContaining(["mewtwo", "lugia", "rayquaza", "giratina"]));
    expect(names).not.toContain("mew");
    expect(snapshotPool().some((p) => p.legendary)).toBe(false);
  });

  it("falls back to the snapshots when GraphQL fails, and memoizes", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const load = vi.fn().mockRejectedValue(new Error("down"));
    const loader = createGamePoolLoader(load);
    const pool = await loader();
    await loader();
    expect(pool).toEqual(snapshotGamePool());
    expect(load).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });
});
