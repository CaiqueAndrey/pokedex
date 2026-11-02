import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { messages } from "@/config/messages";
import { FavoritesView } from "@/features/favorites/favorites-view";

export const metadata: Metadata = { title: messages.favorites.title };

export default function FavoritesPage() {
  return (
    <>
      <PageHeader title={messages.favorites.title} description={messages.favorites.description} />
      <FavoritesView />
    </>
  );
}
