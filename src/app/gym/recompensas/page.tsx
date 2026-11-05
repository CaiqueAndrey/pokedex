import type { Metadata } from "next";
import { REWARD_ITEM_NAMES } from "@/config/gym";
import { messages } from "@/config/messages";
import { GymRewardsPage } from "@/features/gym/gym-rewards";
import { getBattlePool, getPokedex } from "@/server/pokedex/next-cache";

export const metadata: Metadata = {
  title: `${messages.gym.hub.rewardsTitle} · ${messages.gym.title}`,
  description: messages.gym.hub.rewardsDescription,
};

// Depends on live (cached) API data, so never prerender it at build time.
export const dynamic = "force-dynamic";

export default async function GymRewardsRoute() {
  const [pool, items] = await Promise.all([
    getBattlePool(),
    getPokedex()
      .getItems(REWARD_ITEM_NAMES)
      .catch(() => []),
  ]);
  return <GymRewardsPage legendaries={pool.filter((p) => p.legendary)} items={items} />;
}
