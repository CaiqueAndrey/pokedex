import type { Metadata } from "next";
import { REWARD_ITEM_NAMES } from "@/config/gym";
import { messages } from "@/config/messages";
import { GymGame } from "@/features/gym/gym-game";
import { getBattlePool, getPokedex } from "@/server/pokedex/next-cache";

export const metadata: Metadata = {
  title: messages.gym.title,
  description: messages.gym.description,
};

// Depends on live (cached) API data, so never prerender it at build time.
export const dynamic = "force-dynamic";

export default async function GymPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { seed } = await searchParams;
  const fixedSeed = typeof seed === "string" && /^[\w-]{1,40}$/.test(seed) ? seed : undefined;
  const pokedex = getPokedex();
  const [pool, relations, items] = await Promise.all([
    getBattlePool(),
    pokedex.getTypeRelations(),
    // Item sprites are a nice-to-have: the game works without them.
    pokedex.getItems(REWARD_ITEM_NAMES).catch(() => []),
  ]);
  return <GymGame pool={pool} relations={relations} items={items} seed={fixedSeed} />;
}
