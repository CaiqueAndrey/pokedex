import type { Metadata } from "next";
import { messages } from "@/config/messages";
import { QuizGame } from "@/features/quiz/quiz-game";
import { quizPool } from "@/lib/quiz";
import { getPokedex } from "@/server/pokedex/next-cache";

export const metadata: Metadata = {
  title: messages.quiz.title,
  description: messages.quiz.description,
};

// Depends on live (cached) API data, so never prerender it at build time.
export const dynamic = "force-dynamic";

export default async function QuizPage() {
  const pool = quizPool(await getPokedex().listPokemon());
  return <QuizGame pool={pool} />;
}
