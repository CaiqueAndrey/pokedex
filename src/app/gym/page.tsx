import type { Metadata } from "next";
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
  const [pool, relations] = await Promise.all([getBattlePool(), getPokedex().getTypeRelations()]);
  return <GymGame pool={pool} relations={relations} seed={fixedSeed} />;
}
