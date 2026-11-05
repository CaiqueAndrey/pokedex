"use client";

import { Send } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { QUIZ_SUGGESTIONS } from "@/config/quiz";
import { messages } from "@/config/messages";
import { formatName } from "@/lib/format";
import { matchGuess, suggestions, type QuizEntry } from "@/lib/quiz";

const q = messages.quiz;

/**
 * The guess field: a combobox (ARIA 1.2 pattern) that suggests names as you type. Arrow keys move
 * through the list, Enter picks; a typed exact name works too. Unknown or repeated names are refused
 * with a message instead of costing a guess.
 */
export function GuessForm({
  pool,
  guessed,
  onGuess,
}: {
  pool: readonly QuizEntry[];
  guessed: readonly string[];
  onGuess: (entry: QuizEntry) => void;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [active, setActive] = useState(-1);
  const [error, setError] = useState("");
  const options = suggestions(pool, text, QUIZ_SUGGESTIONS, guessed);
  const open = options.length > 0 && text.trim().length > 0;

  function submit(entry: QuizEntry | undefined) {
    if (!entry) return setError(q.notFound);
    if (guessed.includes(entry.name)) return setError(q.already);
    setError("");
    setText("");
    setActive(-1);
    onGuess(entry);
  }

  return (
    <form
      className="relative grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        submit(
          options[active] ??
            matchGuess(pool, text) ??
            (options.length === 1 ? options[0] : undefined),
        );
      }}
    >
      <label htmlFor={`${id}-input`} className="font-display text-[0.6rem]">
        {q.guessLabel}
      </label>
      <div className="flex gap-2">
        <input
          id={`${id}-input`}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={text}
          placeholder={q.guessPlaceholder}
          onChange={(event) => {
            setText(event.target.value);
            setActive(-1);
            setError("");
          }}
          onKeyDown={(event) => {
            if (!open) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((i) => (i + 1) % options.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
            } else if (event.key === "Escape") {
              setText("");
            }
          }}
          className="border-border bg-surface min-h-11 min-w-0 flex-1 rounded-xl border-2 px-3 text-base"
        />
        <Button type="submit" disabled={!text.trim()}>
          <Send aria-hidden className="size-4" />
          {q.guess}
        </Button>
      </div>
      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label={q.suggestions}
          className="border-border bg-surface absolute top-full right-0 left-0 z-20 mt-1 grid max-h-64 overflow-auto rounded-2xl border-2 p-1 shadow-[4px_4px_0_0_var(--border)]"
        >
          {options.map((entry, index) => (
            <li
              key={entry.name}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={index === active}
              // mousedown, not click: it fires before the input loses focus.
              onMouseDown={(event) => {
                event.preventDefault();
                submit(entry);
              }}
              className={cn(
                "flex min-h-11 cursor-pointer items-center rounded-xl px-3 text-base",
                index === active ? "bg-primary-600 text-on-primary" : "hover:bg-border/60",
              )}
            >
              {formatName(entry.name)}
            </li>
          ))}
        </ul>
      )}
      <p id={`${id}-error`} className="text-sm font-bold" role="alert">
        {error}
      </p>
    </form>
  );
}
