import { GYMS, TEAM_SIZE } from "@/config/gym";
import type { BattlePokemon } from "@/types/battle";
import type { TypeRelations } from "@/types/pokemon";
import { counterPick, generateOpponent } from "./opponents";
import { rngFrom } from "./rng";

export type FriendlyLeader = "easy" | "hard";

/**
 * A friendly battle against a gym leader with the Pokédex's "Meu time" (any Pokémon, forms
 * included). The leader brings a team like in the gym's last battle (its budget and signature
 * Pokémon), reacts to your lead, and fights on its field. Nothing is saved or rewarded.
 */
export function friendlyOpponent(
  pool: readonly BattlePokemon[],
  leader: FriendlyLeader,
  seed: string,
  playerLead: BattlePokemon | undefined,
  relations: TypeRelations,
): BattlePokemon[] {
  const gym = GYMS[leader];
  const boss = gym.battles.at(-1);
  const regular = pool.filter((p) => !p.legendary);
  const signature = boss?.signature ? regular.filter((p) => p.name === boss.signature) : [];
  const team = generateOpponent(
    regular,
    Math.round(gym.rules.opponents * (boss?.budgetFactor ?? 1)),
    rngFrom(seed, "friendly", leader),
    TEAM_SIZE,
    { signature },
  );
  return counterPick(team, playerLead, relations);
}
