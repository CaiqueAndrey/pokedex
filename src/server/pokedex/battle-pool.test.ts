import { describe, expect, it, vi } from "vitest";
import {
  createBattlePoolLoader,
  fetchBattlePool,
  mapPoolResponse,
  poolMaxSpeciesId,
  snapshotPool,
} from "./battle-pool";

const stat = (name: string, base_stat: number) => ({ base_stat, pokemon_v2_stat: { name } });

const raw = {
  data: {
    pokemon_v2_pokemonspecies: [
      {
        id: 6,
        name: "charizard",
        evolution_chain_id: 2,
        is_baby: false,
        pokemon_v2_pokemons: [
          {
            id: 6,
            pokemon_v2_pokemonstats: [
              stat("hp", 78),
              stat("attack", 84),
              stat("defense", 78),
              stat("special-attack", 109),
              stat("special-defense", 85),
              stat("speed", 100),
            ],
            pokemon_v2_pokemontypes: [
              { slot: 2, pokemon_v2_type: { name: "flying" } },
              { slot: 1, pokemon_v2_type: { name: "fire" } },
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

  it("asks for generations 1–2", () => {
    expect(poolMaxSpeciesId()).toBe(251);
  });

  it("posts the query and validates the response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(raw)));
    const pool = await fetchBattlePool({ endpoint: "http://gql.test", fetch: fetchMock });
    expect(pool[0]?.name).toBe("charizard");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body)).variables).toEqual({ maxId: 251 });

    const bad = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {} })));
    await expect(fetchBattlePool({ fetch: bad })).rejects.toThrow(/Unexpected GraphQL shape/);
  });

  it("falls back to the snapshot when GraphQL fails, and memoizes", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const load = vi.fn().mockRejectedValue(new Error("down"));
    const loader = createBattlePoolLoader(load);
    const pool = await loader();
    await loader();
    expect(pool).toEqual(snapshotPool());
    expect(load).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });
});
