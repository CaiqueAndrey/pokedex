import type { ReactNode } from "react";
import { Card } from "./card";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="font-display text-xs leading-relaxed">{title}</p>
      {description && <p className="text-muted max-w-md text-sm">{description}</p>}
      {action}
    </Card>
  );
}
