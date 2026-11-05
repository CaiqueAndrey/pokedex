import {
  ITEM_EFFECTS,
  REWARD_ITEM_NAMES,
  TRAIN_BOOST,
  TRAINED_STATS,
  type RewardItemName,
} from "@/config/gym";
import type { BattlePokemon } from "@/types/battle";

/**
 * Bag items in a run, simplified on purpose (no evolution data beyond the family): a Pokémon's
 * next stage is the family member with the next higher stat total; a stone only works when that
 * evolution has one of the stone's types, the Rare Candy always works. Pure, so tests and the UI
 * agree on what is possible.
 */

const isItem = (name: string): name is RewardItemName =>
  (REWARD_ITEM_NAMES as readonly string[]).includes(name);

/** What `pokemon` becomes with `item`, if anything: the next stage in its family (no legendaries). */
export function evolutionOf(
  pokemon: BattlePokemon,
  pool: readonly BattlePokemon[],
  item: RewardItemName = "rare-candy",
): BattlePokemon | undefined {
  const effect = ITEM_EFFECTS[item];
  if (effect.kind !== "evolve") return undefined;
  const later = pool.filter(
    (p) => p.family === pokemon.family && !p.legendary && p.bst > pokemon.bst,
  );
  const fitting = effect.types
    ? later.filter((p) => p.types.some((type) => effect.types?.includes(type)))
    : later;
  // The nearest stage first (Charmander → Charmeleon, not Charizard); ties by number.
  return [...fitting].sort((a, b) => a.bst - b.bst || a.id - b.id)[0];
}

/** Items in the bag that can do something for this team right now (evolve someone). */
export function evolveItems(
  bag: Readonly<Record<string, number>>,
  team: readonly BattlePokemon[],
  pool: readonly BattlePokemon[],
): RewardItemName[] {
  return Object.entries(bag)
    .filter(([name, count]) => count > 0 && isItem(name))
    .map(([name]) => name as RewardItemName)
    .filter((item) => team.some((member) => evolutionOf(member, pool, item)));
}

/** Valuables that buy a reroll (Pepita, Pedaço de Estrela), owned. */
export function rerollItems(bag: Readonly<Record<string, number>>): RewardItemName[] {
  return REWARD_ITEM_NAMES.filter(
    (name) => ITEM_EFFECTS[name].kind === "reroll" && (bag[name] ?? 0) > 0,
  );
}

/** A trained Pokémon: attacks and speed up by `TRAIN_BOOST` (the stat total, used for budgets, not). */
export function trained(pokemon: BattlePokemon): BattlePokemon {
  const stats = { ...pokemon.stats };
  for (const stat of TRAINED_STATS) stats[stat] = Math.round(stats[stat] * (1 + TRAIN_BOOST));
  return { ...pokemon, stats };
}
