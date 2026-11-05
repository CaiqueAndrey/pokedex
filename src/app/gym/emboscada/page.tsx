import type { Metadata } from "next";
import { REWARD_ITEM_NAMES } from "@/config/gym";
import { messages } from "@/config/messages";
import { RocketAmbush } from "@/features/gym/rocket-ambush";
import { getBattlePool, getPokedex } from "@/server/pokedex/next-cache";

export const metadata: Metadata = {
  title: `${messages.gym.rocket.title} · ${messages.gym.title}`,
  description: messages.gym.modes.daily.description,
};

// Depends on live (cached) API data, so never prerender it at build time.
export const dynamic = "force-dynamic";

export default async function RocketAmbushRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { dia } = await searchParams;
  const day = typeof dia === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : undefined;
  const pokedex = getPokedex();
  const [pool, relations, items] = await Promise.all([
    getBattlePool(),
    pokedex.getTypeRelations(),
    pokedex.getItems(REWARD_ITEM_NAMES).catch(() => []),
  ]);
  return <RocketAmbush pool={pool} relations={relations} items={items} day={day} />;
}
