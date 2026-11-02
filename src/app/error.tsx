"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { messages } from "@/config/messages";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      title={messages.errors.title}
      description={messages.errors.description}
      action={<Button onClick={reset}>{messages.errors.retry}</Button>}
    />
  );
}
