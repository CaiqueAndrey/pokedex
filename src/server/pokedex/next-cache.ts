import "server-only";
import { CACHE_TTL_SECONDS } from "@/config/pokedex";
import { MemoryCache } from "../pokeapi/cache";
import { createPokeApiClient } from "../pokeapi/client";
import { createGamePoolLoader } from "./battle-pool";
import { createPokedexService, type PokedexService } from "./service";

/**
 * The only server file that knows about Next.js. Next 16 does not cache `fetch` by default,
 * so we opt in with `next.revalidate` (the Data Cache survives restarts and dev reloads) and
 * keep a process-wide in-memory cache on top to skip repeated requests and JSON parsing.
 */
const globalForPokedex = globalThis as unknown as {
  __pokedexService?: PokedexService;
  __battlePool?: ReturnType<typeof createGamePoolLoader>;
};

export function getPokedex(): PokedexService {
  globalForPokedex.__pokedexService ??= createPokedexService(
    createPokeApiClient({
      cache: new MemoryCache(),
      requestInit: { next: { revalidate: CACHE_TTL_SECONDS } } as RequestInit,
    }),
  );
  return globalForPokedex.__pokedexService;
}

/** Gym game pool: regular Pokémon plus legendaries (GraphQL, memoized for a day, snapshot fallback). */
export function getBattlePool() {
  globalForPokedex.__battlePool ??= createGamePoolLoader();
  return globalForPokedex.__battlePool();
}
