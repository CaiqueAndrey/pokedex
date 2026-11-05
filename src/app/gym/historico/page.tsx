import type { Metadata } from "next";
import { messages } from "@/config/messages";
import { GymHistory } from "@/features/gym/gym-history";
import { getBattlePool } from "@/server/pokedex/next-cache";

export const metadata: Metadata = {
  title: `${messages.gym.history.title} · ${messages.gym.title}`,
  description: messages.gym.history.description,
};

// Depends on live (cached) API data, so never prerender it at build time.
export const dynamic = "force-dynamic";

export default async function GymHistoryRoute() {
  return <GymHistory pool={await getBattlePool()} />;
}
