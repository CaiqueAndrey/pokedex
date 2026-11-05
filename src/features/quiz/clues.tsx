import { ArrowDown, ArrowUp, Check, Lock } from "lucide-react";
import Image from "next/image";
import { TypeBadge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { TYPE_LABELS, messages } from "@/config/messages";
import { formatName } from "@/lib/format";
import { compareGuess, hintsFor, type QuizEntry } from "@/lib/quiz";
import { spriteUrl } from "@/lib/sprites";

const q = messages.quiz;

/** The hints unlocked so far (types, generation, first letter, clearer silhouette). */
export function Hints({
  answer,
  misses,
  total,
}: {
  answer: QuizEntry;
  misses: number;
  total: number;
}) {
  const hints = hintsFor(answer, misses);
  const items: { key: string; text: string | null; types?: QuizEntry["types"] }[] = [
    { key: "types", text: hints.types ? q.hintTypes("") : null, types: hints.types },
    { key: "generation", text: hints.generation ? q.hintGeneration(hints.generation) : null },
    {
      key: "letter",
      text:
        hints.firstLetter && hints.length ? q.hintLetter(hints.firstLetter, hints.length) : null,
    },
    { key: "clearer", text: hints.clearer ? q.hintClearer : null },
  ].slice(0, Math.max(0, total - 1));
  return (
    <section aria-labelledby="hints-title" className="grid gap-2" data-testid="hints">
      <h2 id="hints-title" className="text-[0.65rem]">
        {q.hintsTitle}
      </h2>
      <ul className="grid gap-1 text-sm">
        {items.map((item) => (
          <li
            key={item.key}
            className={cn("flex min-h-8 items-center gap-2", !item.text && "text-muted")}
            data-testid={item.text ? "hint-open" : "hint-locked"}
          >
            {item.text ? (
              <Check aria-hidden className="size-4 shrink-0 text-green-600" />
            ) : (
              <Lock aria-hidden className="size-4 shrink-0" />
            )}
            {item.text ?? q.hintLocked}
            {item.types?.map((type) => (
              <TypeBadge key={type} type={type} className="px-2 text-[0.65rem]" />
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Wrong guesses, each with what it tells about the answer (shared types, older or newer). */
export function GuessList({
  guesses,
  pool,
  answer,
}: {
  guesses: readonly string[];
  pool: readonly QuizEntry[];
  answer: QuizEntry;
}) {
  const byName = new Map(pool.map((entry) => [entry.name, entry]));
  const wrong = guesses.flatMap((name) => (name === answer.name ? [] : (byName.get(name) ?? [])));
  if (wrong.length === 0) return null;
  return (
    <section aria-labelledby="guesses-title" className="grid gap-2">
      <h2 id="guesses-title" className="text-[0.65rem]">
        {q.guessesTitle}
      </h2>
      <ol className="grid gap-2">
        {wrong.map((entry) => {
          const clue = compareGuess(entry, answer);
          const Arrow = clue.generation === "higher" ? ArrowUp : ArrowDown;
          return (
            <li
              key={entry.name}
              className="border-border bg-surface flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border-2 p-2"
              data-testid="wrong-guess"
            >
              <Image
                src={spriteUrl(entry.id, "default")}
                alt=""
                width={40}
                height={40}
                unoptimized
                className="size-10"
              />
              <span className="font-display text-[0.6rem] leading-relaxed">
                {formatName(entry.name)}
              </span>
              <span className="text-sm">
                {clue.sharedTypes.length > 0
                  ? q.sharedTypes(clue.sharedTypes.map((t) => TYPE_LABELS[t]).join(", "))
                  : q.noSharedTypes}
              </span>
              <span className="flex items-center gap-1 text-sm">
                {clue.generation !== "same" && <Arrow aria-hidden className="size-4" />}
                {q.generation[clue.generation]}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
