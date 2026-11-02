import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { messages } from "@/config/messages";

export default function NotFound() {
  return (
    <EmptyState
      title={messages.errors.pageNotFound}
      action={<LinkButton href="/">{messages.detail.back}</LinkButton>}
    />
  );
}
