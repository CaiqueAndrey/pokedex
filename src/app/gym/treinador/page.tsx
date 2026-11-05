import type { Metadata } from "next";
import { messages } from "@/config/messages";
import { TrainerCard } from "@/features/gym/trainer-card";
import { getBattlePool } from "@/server/pokedex/next-cache";

export const metadata: Metadata = {
  title: `${messages.gym.trainer.title} · ${messages.gym.title}`,
  description: messages.gym.trainer.description,
};

// Depends on live (cached) API data, so never prerender it at build time.
export const dynamic = "force-dynamic";

export default async function TrainerRoute() {
  return <TrainerCard pool={await getBattlePool()} />;
}
