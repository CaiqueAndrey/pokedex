import { describe, expect, it } from "vitest";
import { MemoryCache } from "./cache";

describe("MemoryCache", () => {
  it("returns stored values until the TTL expires", () => {
    let now = 1_000;
    const cache = new MemoryCache(() => now);
    cache.set("a", { x: 1 }, 10);
    expect(cache.get("a")).toEqual({ x: 1 });
    now += 9_999;
    expect(cache.get("a")).toEqual({ x: 1 });
    now += 1;
    expect(cache.get("a")).toBeUndefined();
  });

  it("returns undefined for unknown keys", () => {
    expect(new MemoryCache().get("missing")).toBeUndefined();
  });
});
