import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { messages } from "@/config/messages";

export default function Loading() {
  return (
    <div role="status" aria-label={messages.errors.loading}>
      <Image
        src="/img/pokebola.png"
        alt=""
        width={48}
        height={48}
        className="mb-4 size-12 animate-spin"
      />
      <Skeleton className="mb-2 h-9 w-48" />
      <Skeleton className="mb-6 h-5 w-full max-w-md" />
      <Skeleton className="mb-6 h-11 w-full" />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 12 }, (_, i) => (
          <li key={i}>
            <Skeleton className="aspect-[3/4] w-full" />
          </li>
        ))}
      </ul>
    </div>
  );
}
