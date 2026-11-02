import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { messages } from "@/config/messages";

export default function PokemonNotFound() {
  return (
    <EmptyState
      title={messages.errors.notFoundTitle}
      description={messages.errors.notFoundDescription}
      action={<LinkButton href="/">{messages.detail.back}</LinkButton>}
    />
  );
}
