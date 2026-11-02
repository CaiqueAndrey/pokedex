import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { messages } from "@/config/messages";
import { TeamView } from "@/features/team/team-view";
import { getPokedex } from "@/server/pokedex/next-cache";

export const metadata: Metadata = { title: messages.team.title };

// Depends on live (cached) API data, so never prerender it at build time.
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const relations = await getPokedex().getTypeRelations();
  return (
    <>
      <PageHeader title={messages.team.title} description={messages.team.description} />
      <TeamView relations={relations} />
    </>
  );
}
