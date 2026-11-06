"use client";

import { useState, type ReactNode } from "react";
import { messages } from "@/config/messages";
import { Button } from "./button";
import { Dialog } from "./dialog";

/**
 * A button that opens a dialog with longer content (rules, a challenge's details), so the screen
 * keeps only what's needed to decide. The content is only mounted while open.
 */
export function ModalButton({
  label,
  title,
  icon,
  variant = "ghost",
  className,
  testId,
  children,
}: {
  label: ReactNode;
  title: ReactNode;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  testId?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={variant}
        className={className}
        onClick={() => setOpen(true)}
        data-testid={testId}
      >
        {icon}
        {label}
      </Button>
      {open && (
        <Dialog
          open
          title={title}
          onClose={() => setOpen(false)}
          testId={testId ? `${testId}-dialog` : undefined}
          className="max-h-[85dvh] overflow-y-auto"
        >
          <div className="grid gap-3 text-base">{children}</div>
          <div className="mt-4 flex justify-center">
            <Button variant="secondary" onClick={() => setOpen(false)} autoFocus>
              {messages.tip.close}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
