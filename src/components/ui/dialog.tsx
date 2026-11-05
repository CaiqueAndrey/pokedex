"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "./cn";

/**
 * A modal on the native `<dialog>`: `showModal()` gives focus trapping, the inert background and
 * `Esc` for free. `Esc` calls `onClose` instead of closing, so the caller decides what closing means.
 */
export function Dialog({
  open,
  title,
  onClose,
  children,
  className,
  testId,
}: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Keep the dialog in React's hands: `Esc` asks the caller instead of closing on its own.
        event.preventDefault();
        onClose();
      }}
      className={cn(
        "border-border bg-surface text-foreground open:motion-safe:animate-pop m-auto w-[min(32rem,calc(100%-2rem))] rounded-3xl border-2 p-5 shadow-[6px_6px_0_0_var(--border)] backdrop:bg-black/60",
        className,
      )}
      data-testid={testId}
    >
      <h2 id={titleId} className="mb-3 text-center text-sm leading-relaxed sm:text-base">
        {title}
      </h2>
      {children}
    </dialog>
  );
}
