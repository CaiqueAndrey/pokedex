"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { shareText, type ShareResult } from "@/lib/battle/progress";

const m = messages.gym;

/**
 * Web Share API on phones; elsewhere the text goes to the clipboard. Takes a gym result, or any
 * text built from the page's origin (the quiz).
 */
export function ShareButton({
  result,
  text: build,
  title = m.shareTitle,
  variant = "secondary",
}: {
  result?: ShareResult;
  text?: (origin: string) => string;
  title?: string;
  variant?: "primary" | "secondary";
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const origin = window.location.origin;
    const text = build ? build(origin) : result ? shareText(result, origin) : origin;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, text });
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
