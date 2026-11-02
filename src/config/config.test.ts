import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { contrastRatio } from "@/lib/color";
import { POKEMON_TYPES } from "@/types/pokemon";
import { TYPE_STYLES } from "./pokemon-types";

describe("type colors", () => {
  it.each(POKEMON_TYPES)("%s badge text meets WCAG AA (4.5:1)", (type) => {
    const { color, textColor } = TYPE_STYLES[type];
    expect(contrastRatio(color, textColor)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("framework-independent core", () => {
  const roots = ["src/server/pokeapi", "src/server/pokedex", "src/lib"];
  const allowed = new Set(["next-cache.ts"]);

  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const full = path.join(dir, entry);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  }

  it("never imports next/* or server-only", () => {
    const offenders = roots
      .flatMap(walk)
      .filter((file) => /\.tsx?$/.test(file) && !allowed.has(path.basename(file)))
      .filter((file) => /from\s+["'](next(\/|["'])|server-only)/.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});
