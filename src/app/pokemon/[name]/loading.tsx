import { Skeleton } from "@/components/ui/skeleton";
import { messages } from "@/config/messages";

export default function Loading() {
  return (
    <div role="status" aria-label={messages.errors.loading}>
      <Skeleton className="mb-4 h-11 w-40" />
      <Skeleton className="mb-6 h-96 w-full rounded-3xl" />
      <div className="grid gap-8 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
