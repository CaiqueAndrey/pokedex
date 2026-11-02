import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="animate-fade-up relative mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="animate-pan from-foreground via-primary-600 to-foreground bg-linear-to-r bg-[length:200%_100%] bg-clip-text text-lg text-transparent sm:text-2xl">
          {title}
        </h1>
        {description && <p className="text-muted mt-1 max-w-2xl text-sm">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
