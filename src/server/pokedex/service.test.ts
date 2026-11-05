import { describe, expect, it } from "vitest";
import { createFixtureClient } from "../pokeapi/fixtures";
import { createPokedexService } from "./service";

const service = createPokedexService(createFixtureClient());

describe("listPokemon (index)", () => {
  it("contains species and alternative forms, sorted by Pokédex number", async () => {
    const all = await service.listPokemon();
    const ids = all.map((p) => p.speciesId);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(all.filter((p) => p.isDefault).length).toBe(63);
    expect(all.find((p) => p.name === "pikachu")).toMatchObject({
      speciesId: 25,
      types: ["electric"],
      generation: 1,
    });
  });

  it("classifies forms and keeps the species number", async () => {
    const all = await service.listPokemon();
    expect(all.find((p) => p.name === "raichu-alola")).toMatchObject({
      speciesId: 26,
      speciesName: "raichu",
      isDefault: false,
      form: { category: "regional", label: "Alola" },
      types: ["electric", "psychic"],
    });
    expect(all.find((p) => p.name === "charizard-mega-x")?.form).toEqual({
      category: "mega",
      label: "Mega X",
    });
    expect(all.find((p) => p.name === "pikachu-gmax")?.form?.category).toBe("gmax");
  });

  it("leaves out cosmetic forms", async () => {
    const all = await service.listPokemon();
    expect(all.some((p) => p.name === "pikachu-cosplay")).toBe(false);
  });

  it("keeps type slot order (primary first)", async () => {
    const all = await service.listPokemon();
    expect(all.find((p) => p.name === "charizard")?.types).toEqual(["fire", "flying"]);
  });
});

describe("getPokemonDetail", () => {
  it("maps units, stats, text and artwork", async () => {
    const detail = await service.getPokemonDetail("pikachu");
    expect(detail).toMatchObject({
      speciesId: 25,
      heightM: 0.4,
      weightKg: 6,
      generation: 1,
      genus: "Mouse Pokémon",
    });
    expect(detail?.stats).toHaveLength(6);
    expect(detail?.flavorText).not.toMatch(/[\f\n]/);
    expect(detail?.artwork.default).toContain("official-artwork");
    expect(detail?.varieties.map((v) => v.name)).not.toContain("pikachu-cosplay");
    expect(detail?.varieties.map((v) => v.name)).toContain("pikachu-gmax");
  });

  it("returns form details with the form label", async () => {
    const detail = await service.getPokemonDetail("raichu-alola");
    expect(detail?.form?.label).toBe("Alola");
    expect(detail?.speciesId).toBe(26);
  });

  it("accepts numbers and returns null for unknown names", async () => {
    expect((await service.getPokemonDetail("25"))?.name).toBe("pikachu");
    expect(await service.getPokemonDetail("missingno")).toBeNull();
  });
});

describe("getEvolutionChain", () => {
  it("builds a tree (Eevee branches into 8)", async () => {
    const detail = await service.getPokemonDetail("eevee");
    const chain = await service.getEvolutionChain(detail!.evolutionChainId);
    expect(chain?.name).toBe("eevee");
    expect(chain?.evolvesTo).toHaveLength(8);
    expect(chain?.evolvesTo.find((n) => n.name === "vaporeon")?.trigger).toBe("Water Stone");
  });

  it("handles Pokémon without evolutions", async () => {
    const detail = await service.getPokemonDetail("skarmory");
    expect(detail).not.toBeNull();
    const chain = await service.getEvolutionChain(detail?.evolutionChainId ?? 0);
    expect(chain?.evolvesTo ?? []).toEqual([]);
  });
});

describe("getTypeRelations", () => {
  it("returns multipliers for all 18 types", async () => {
    const relations = await service.getTypeRelations();
    expect(Object.keys(relations)).toHaveLength(18);
    expect(relations.fire.grass).toBe(2);
    expect(relations.normal.ghost).toBe(0);
    expect(relations.water.dragon).toBe(0.5);
  });
});

describe("getItems", () => {
  it("maps reward items from the PokeAPI and skips unknown names", async () => {
    const items = await service.getItems(["thunder-stone", "rare-candy", "not-an-item"]);
    expect(items.map((item) => item.name)).toEqual(["thunder-stone", "rare-candy"]);
    expect(items[0]).toMatchObject({ category: "evolution" });
    expect(items[0]?.sprite).toMatch(/sprites\/items\/thunder-stone\.png$/);
  });
});
