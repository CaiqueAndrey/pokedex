"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { shareText, type ShareResult } from "@/lib/battle/progress";

const m = messages.gym;

/** Web Share API on phones; elsewhere the text goes to the clipboard. */
export function ShareButton({
  result,
  variant = "secondary",
}: {
  result: ShareResult;
  variant?: "primary" | "secondary";
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const text = shareText(result, window.location.origin);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: m.shareTitle, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Share sheet dismissed or clipboard blocked: nothing to do.
    }
  }

  return (
    <Button variant={variant} onClick={share} data-testid="share">
      {copied ? (
        <Check aria-hidden className="size-4" />
      ) : (
        <Share2 aria-hidden className="size-4" />
      )}
      <span aria-live="polite">{copied ? m.copied : m.share}</span>
    </Button>
  );
}
