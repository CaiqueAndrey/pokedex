import type { PokeApiClient } from "../client";
import data from "./pokeapi.json";

const resources = data as Record<string, unknown>;

/** Resolves a PokeAPI path (query string ignored) from the recorded fixtures. */
export function fixtureLookup(path: string): unknown | null {
  const key = path.split("?")[0] ?? path;
  return resources[key] ?? null;
}

export function createFixtureClient(): PokeApiClient {
  return { get: async (path) => fixtureLookup(path) };
}
