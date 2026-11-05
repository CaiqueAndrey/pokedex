/**
 * Records the gym draft pool from PokeAPI's GraphQL endpoint into
 * src/server/pokedex/data/battle-pool.json. Run manually: `yarn battle-pool:record`.
 * The file is the app's fallback when GraphQL is down and the fixture for tests and E2E.
 */
import { writeFileSync } from "node:fs";
import { fetchBattlePool } from "../src/server/pokedex/battle-pool";

async function main() {
  const pool = await fetchBattlePool({ timeoutMs: 30_000 });
  writeFileSync("src/server/pokedex/data/battle-pool.json", `${JSON.stringify(pool)}\n`);
  const families = new Set(pool.map((p) => p.family)).size;
  console.error(`Recorded ${pool.length} Pokémon in ${families} families.`);
  const legendaries = await fetchBattlePool({ timeoutMs: 30_000, legendary: true });
  writeFileSync("src/server/pokedex/data/legendary-pool.json", `${JSON.stringify(legendaries)}\n`);
  console.error(`Recorded ${legendaries.length} legendaries.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
