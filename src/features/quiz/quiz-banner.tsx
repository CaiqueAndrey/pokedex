import { CircleHelp } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { messages } from "@/config/messages";

const b = messages.quiz.banner;

/** The daily quiz's door on the Pokédex home: a silhouette and one button. */
export function QuizBanner() {
  return (
    <aside
      aria-labelledby="quiz-banner-title"
      className="mb-6 flex flex-wrap items-center gap-4 rounded-3xl border-4 border-sky-600 bg-sky-500/10 p-4 shadow-[5px_5px_0_0_var(--border)]"
      data-testid="quiz-banner"
    >
      <span
        aria-hidden
        className="font-display grid size-14 shrink-0 place-items-center rounded-2xl bg-sky-600 text-2xl text-white"
      >
        ?
      </span>
      <div className="grid min-w-52 flex-1 gap-1">
        <h2 id="quiz-banner-title" className="text-[0.7rem] sm:text-xs">
          {b.title}
        </h2>
        <p className="text-sm">{b.text}</p>
      </div>
      <LinkButton href="/quiz" variant="secondary" className="shrink-0">
        <CircleHelp aria-hidden className="size-4" />
        {b.cta}
      </LinkButton>
    </aside>
  );
}
