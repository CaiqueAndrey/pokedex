import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { messages } from "@/config/messages";
import {
  filtersToSearchParams,
  type Pagination as PaginationData,
  type PokedexFilters,
} from "@/lib/filters";

const itemClass =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl px-3 text-sm font-medium";

export function Pagination({
  pagination,
  filters,
}: {
  pagination: PaginationData;
  filters: PokedexFilters;
}) {
  if (pagination.totalPages <= 1) return null;
  const hrefFor = (page: number) => {
    const query = filtersToSearchParams({ ...filters, page }).toString();
    return query ? `/?${query}` : "/";
  };
  const { page, totalPages } = pagination;

  return (
    <nav aria-label={messages.list.pagination} className="mt-8">
      <ul className="flex flex-wrap items-center justify-center gap-1">
        {page > 1 && (
          <li>
            <Link
              href={hrefFor(page - 1)}
              className={cn(itemClass, "hover:bg-border/60")}
              aria-label={messages.list.previous}
            >
              <ChevronLeft aria-hidden className="size-5" />
            </Link>
          </li>
        )}
        {pagination.items.map((item, index) =>
          item === "ellipsis" ? (
            <li key={`e${index}`} aria-hidden className={cn(itemClass, "text-muted")}>
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                href={hrefFor(item)}
                aria-label={messages.list.page(item)}
                aria-current={item === page ? "page" : undefined}
                className={cn(
                  itemClass,
                  item === page
                    ? "bg-primary-600 text-on-primary"
                    : "border-border hover:bg-border/60 border",
                )}
              >
                {item}
              </Link>
            </li>
          ),
        )}
        {page < totalPages && (
          <li>
            <Link
              href={hrefFor(page + 1)}
              className={cn(itemClass, "hover:bg-border/60")}
              aria-label={messages.list.next}
            >
              <ChevronRight aria-hidden className="size-5" />
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
