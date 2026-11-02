import { CACHE_TTL_SECONDS, DEFAULT_POKEAPI_BASE_URL } from "@/config/pokedex";
import type { PokeApiCache } from "./cache";

export class PokeApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "PokeApiError";
  }
}

export interface PokeApiClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  cache?: PokeApiCache;
  ttlSeconds?: number;
  fetch?: typeof fetch;
  /** Extra `fetch` init (e.g. framework-specific cache hints), passed through untouched. */
  requestInit?: RequestInit;
}

export interface PokeApiClient {
  /** GET a resource path. Returns `null` on 404, throws `PokeApiError` otherwise. */
  get(path: string): Promise<unknown | null>;
}

export function createPokeApiClient(options: PokeApiClientOptions = {}): PokeApiClient {
  const baseUrl = (
    options.baseUrl ??
    process.env.POKEAPI_BASE_URL ??
    DEFAULT_POKEAPI_BASE_URL
  ).replace(/\/$/, "");
  const timeoutMs = options.timeoutMs ?? 10_000;
  const ttl = options.ttlSeconds ?? CACHE_TTL_SECONDS;
  const doFetch = options.fetch ?? fetch;
  const inflight = new Map<string, Promise<unknown | null>>();

  async function request(path: string): Promise<unknown | null> {
    let response: Response;
    try {
      response = await doFetch(`${baseUrl}${path}`, {
        ...options.requestInit,
        signal: AbortSignal.timeout(timeoutMs),
        headers: { accept: "application/json" },
      });
    } catch (cause) {
      throw new PokeApiError(`Request to ${path} failed: ${(cause as Error).message}`);
    }
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new PokeApiError(`PokeAPI responded ${response.status} for ${path}`, response.status);
    }
    try {
      return await response.json();
    } catch {
      throw new PokeApiError(`Invalid JSON from ${path}`, response.status);
    }
  }

  return {
    async get(path) {
      const cached = options.cache?.get<unknown | null>(path);
      if (cached !== undefined) return cached;
      // Deduplicate concurrent requests for the same path.
      let promise = inflight.get(path);
      if (!promise) {
        promise = request(path)
          .then((data) => {
            if (data !== null) options.cache?.set(path, data, ttl);
            return data;
          })
          .finally(() => inflight.delete(path));
        inflight.set(path, promise);
      }
      return promise;
    },
  };
}
