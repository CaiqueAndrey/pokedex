import { afterEach, describe, expect, it, vi } from "vitest";
import { createFixtureClient } from "@/server/pokeapi/fixtures";
import { createPokedexService } from "@/server/pokedex/service";
import { z } from "zod";
import {
  filterPokemon,
  filtersToSearchParams,
  paginate,
  parseFilters,
  sortPokemon,
} from "./filters";
import {
  cleanFlavorText,
  formatCountdown,
  formatName,
  formatNumber,
  idFromUrl,
  romanToNumber,
} from "./format";
import { levenshtein, normalizeText, parseQuery, suggestNames, toSlug } from "./search";
import { readStorage, writeStorage } from "./storage";
import {
  attackMatchups,
  computeMatchups,
  groupMatchups,
  offensiveGaps,
  sharedWeaknesses,
  teamCoverage,
} from "./type-effectiveness";

const service = createPokedexService(createFixtureClient());

describe("format", () => {
  it("formats names and numbers", () => {
    expect(formatName("mr-mime")).toBe("Mr. Mime");
    expect(formatName("thunder-stone")).toBe("Thunder Stone");
    expect(formatNumber(25)).toBe("#0025");
  });
  it("cleans flavor text and parses ids", () => {
    expect(cleanFlavorText("It has\nsharp\fteeth.")).toBe("It has sharp teeth.");
    expect(idFromUrl("https://pokeapi.co/api/v2/pokemon-species/25/")).toBe(25);
    expect(romanToNumber("ix")).toBe(9);
    expect(romanToNumber("iv")).toBe(4);
  });
});

describe("search", () => {
  it("ignores case, accents and hyphens", () => {
    expect(normalizeText("Mr-Mime")).toBe("mr mime");
    expect(normalizeText("Flabébé")).toBe("flabebe");
  });
  it("detects number queries", () => {
    expect(parseQuery("#025")).toEqual({ kind: "number", number: 25 });
    expect(parseQuery("25")).toEqual({ kind: "number", number: 25 });
    expect(parseQuery("  ")).toEqual({ kind: "empty" });
    expect(parseQuery("Char")).toEqual({ kind: "text", text: "char" });
  });
  it("turns what a person types into a PokeAPI slug", () => {
    expect(toSlug("Mr. Mime")).toBe("mr-mime");
    expect(toSlug(" #025 ")).toBe("25");
    expect(toSlug("Charizard Mega X")).toBe("charizard-mega-x");
    expect(toSlug("Farfetch'd")).toBe("farfetchd");
    expect(toSlug("Nidoran ♀")).toBe("nidoran-f");
    expect(toSlug("Flabébé")).toBe("flabebe");
  });
  it("suggests close names for typos", () => {
    const names = ["pikachu", "raichu", "charmander", "charizard", "charizard-mega-x"];
    expect(levenshtein("pikachu", "pikachu")).toBe(0);
    expect(levenshtein("pikahcu", "pikachu")).toBe(2);
    expect(suggestNames("Pikahcu", names)).toEqual(["pikachu"]);
    expect(suggestNames("chariz", names)).toEqual(["charizard", "charizard-mega-x"]);
    expect(suggestNames("xyz", names)).toEqual([]);
  });
});

describe("filters", () => {
  it("parses search params defensively", () => {
    const filters = parseFilters({
      type: "fire,fire,flying,water,banana",
      gen: "99",
      sort: "x",
      page: "-3",
      forms: "nope",
    });
    expect(filters).toMatchObject({
      types: ["fire", "flying"],
      generation: undefined,
      sort: "number",
      page: 1,
      forms: "none",
    });
  });

  it("round-trips through the URL, omitting defaults", () => {
    const filters = parseFilters({
      q: "char",
      type: "fire",
      gen: "1",
      sort: "name",
      order: "desc",
    });
    expect(filtersToSearchParams(filters).toString()).toBe(
      "q=char&type=fire&gen=1&sort=name&order=desc",
    );
    expect(filtersToSearchParams(parseFilters({})).toString()).toBe("");
  });

  it("filters by name, number, type, generation and forms", async () => {
    const all = await service.listPokemon();
    const base: Parameters<typeof filterPokemon>[1] = {
      q: "",
      types: [],
      generation: undefined,
      forms: "none",
    };
    expect(filterPokemon(all, { ...base, q: "CHAR" }).map((p) => p.name)).toEqual([
      "charmander",
      "charmeleon",
      "charizard",
    ]);
    expect(filterPokemon(all, { ...base, q: "#25" }).map((p) => p.name)).toEqual(["pikachu"]);
    const fireFlying = filterPokemon(all, { ...base, types: ["fire", "flying"] });
    expect(fireFlying.map((p) => p.name)).toEqual(["charizard"]);
    expect(filterPokemon(all, { ...base, generation: 2 }).every((p) => p.generation === 2)).toBe(
      true,
    );
    expect(filterPokemon(all, base).some((p) => !p.isDefault)).toBe(false);
    const withForms = filterPokemon(all, { ...base, forms: "all", types: ["electric", "psychic"] });
    expect(withForms.map((p) => p.name)).toEqual(["raichu-alola"]);
    expect(filterPokemon(all, { ...base, forms: "mega" }).map((p) => p.name)).toContain(
      "charizard-mega-x",
    );
  });

  it("sorts by number or name in both directions", async () => {
    const all = (await service.listPokemon()).filter((p) => p.isDefault);
    expect(sortPokemon(all, "number", "desc")[0]?.speciesId).toBe(700);
    expect(sortPokemon(all, "name", "asc")[0]?.name).toBe("arbok");
  });
});

describe("paginate", () => {
  it("builds ellipsis lists", () => {
    expect(paginate(1025, 5).items).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 43]);
    expect(paginate(1025, 1).items).toEqual([1, 2, "ellipsis", 43]);
    expect(paginate(1025, 43).items).toEqual([1, "ellipsis", 42, 43]);
    expect(paginate(1025, 3).items).toEqual([1, 2, 3, 4, "ellipsis", 43]);
  });
  it("reports ranges and clamps invalid pages", () => {
    expect(paginate(1025, 3)).toMatchObject({ from: 49, to: 72, totalPages: 43 });
    expect(paginate(1025, 999).page).toBe(43);
    expect(paginate(1025, 43).to).toBe(1025);
    expect(paginate(1025, Number.NaN).page).toBe(1);
    expect(paginate(0, 1)).toMatchObject({ from: 0, to: 0, totalPages: 1, items: [1] });
  });
});

describe("type effectiveness", () => {
  it("describes what an attacking type hits", async () => {
    const relations = await service.getTypeRelations();
    expect(attackMatchups("electric", relations)).toEqual({
      superEffective: ["water", "flying"],
      notVeryEffective: ["electric", "grass", "dragon"],
      noEffect: ["ground"],
    });
    // Fire + Water hit grass/ice/bug/steel and fire/ground/rock: nothing else is 2×.
    expect(offensiveGaps(["fire", "water"], relations)).not.toContain("rock");
    expect(offensiveGaps(["fire", "water"], relations)).toContain("dragon");
    expect(offensiveGaps(["normal"], relations)).toHaveLength(18);
  });
  it("handles the classic cases", async () => {
    const relations = await service.getTypeRelations();
    expect(computeMatchups(["fire", "flying"], relations).rock).toBe(4);
    const gengar = computeMatchups(["ghost", "poison"], relations);
    expect(gengar.normal).toBe(0);
    expect(gengar.fighting).toBe(0.5 * 0); // ghost is immune to fighting, poison resists it
    expect(computeMatchups(["steel", "flying"], relations).grass).toBe(0.25);
    // ground immunity cancels the electric weakness of Flying/Water
    expect(computeMatchups(["water", "ground"], relations).electric).toBe(0);
    expect(groupMatchups(computeMatchups(["fire", "flying"], relations)).weak4).toEqual(["rock"]);
  });

  it("computes team coverage and shared weaknesses", async () => {
    const relations = await service.getTypeRelations();
    const rows = teamCoverage(
      [["fire", "flying"], ["water", "flying"], ["electric"], ["rock"]],
      relations,
    );
    const electric = rows.find((r) => r.type === "electric");
    expect(electric?.weak).toBe(2);
    expect(rows.find((r) => r.type === "ground")?.immune).toBe(2);
    expect(sharedWeaknesses(rows, 2)).toContain("electric");
    expect(sharedWeaknesses(rows)).not.toContain("electric");
  });
});

describe("storage", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubWindow(initial: Record<string, string> = {}) {
    const store = new Map(Object.entries(initial));
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
      },
    });
    return store;
  }

  const schema = z.array(z.string());

  it("returns the fallback on the server, on corrupt JSON and on schema mismatch", () => {
    expect(readStorage("k", schema, ["x"])).toEqual(["x"]);
    stubWindow({ a: "{oops", b: "[1,2]" });
    expect(readStorage("a", schema, [])).toEqual([]);
    expect(readStorage("b", schema, [])).toEqual([]);
  });

  it("round-trips valid data", () => {
    stubWindow();
    writeStorage("k", ["pikachu"]);
    expect(readStorage("k", schema, [])).toEqual(["pikachu"]);
  });
});

describe("formatCountdown", () => {
  it("formats seconds as HH:MM:SS", () => {
    expect(formatCountdown(3725)).toBe("01:02:05");
    expect(formatCountdown(0)).toBe("00:00:00");
    expect(formatCountdown(-5)).toBe("00:00:00");
    expect(formatCountdown(86_399)).toBe("23:59:59");
  });
});
