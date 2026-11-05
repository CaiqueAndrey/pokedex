import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * The screen's next step, pinned to the bottom of the viewport while its section is on screen: on
 * phones the primary action is always within thumb reach, full width, and never lost in the text
 * above it. On wider screens the actions sit on the right.
 */
export function ActionBar({
  hint,
  children,
  className,
}: {
  /** One short line above the buttons (what happens next, a counter). */
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border bg-background/95 sticky bottom-0 z-20 -mx-4 grid gap-2 border-t-2 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:mx-0 sm:rounded-2xl sm:border-2 sm:px-3",
        className,
      )}
      data-testid="action-bar"
    >
      {hint && <div className="text-sm">{hint}</div>}
      <div className="flex flex-wrap items-center justify-end gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
        {children}
      </div>
    </div>
  );
}
