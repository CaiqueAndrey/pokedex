import { describe, expect, it, vi } from "vitest";
import { MemoryCache } from "./cache";
import { createPokeApiClient, PokeApiError } from "./client";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("PokeApiClient", () => {
  it("requests the configured base URL and returns parsed JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ ok: true }));
    const client = createPokeApiClient({ baseUrl: "http://api.test/v2/", fetch: fetchMock });
    await expect(client.get("/pokemon/25")).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://api.test/v2/pokemon/25");
  });

  it("returns null on 404", async () => {
    const client = createPokeApiClient({ fetch: vi.fn().mockResolvedValue(json({}, 404)) });
    await expect(client.get("/pokemon/nope")).resolves.toBeNull();
  });

  it("throws PokeApiError with the status on 5xx", async () => {
    const client = createPokeApiClient({ fetch: vi.fn().mockResolvedValue(json({}, 503)) });
    await expect(client.get("/pokemon/1")).rejects.toMatchObject({
      name: "PokeApiError",
      status: 503,
    });
  });

  it("wraps network failures and timeouts in PokeApiError", async () => {
    const client = createPokeApiClient({ fetch: vi.fn().mockRejectedValue(new Error("boom")) });
    await expect(client.get("/pokemon/1")).rejects.toBeInstanceOf(PokeApiError);
  });

  it("caches successful responses and dedupes concurrent calls", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => json({ n: 1 }));
    const client = createPokeApiClient({ fetch: fetchMock, cache: new MemoryCache() });
    await Promise.all([client.get("/a"), client.get("/a")]);
    await client.get("/a");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({}, 500))
      .mockResolvedValueOnce(json({ ok: 1 }));
    const client = createPokeApiClient({ fetch: fetchMock, cache: new MemoryCache() });
    await expect(client.get("/a")).rejects.toBeInstanceOf(PokeApiError);
    await expect(client.get("/a")).resolves.toEqual({ ok: 1 });
  });
});
