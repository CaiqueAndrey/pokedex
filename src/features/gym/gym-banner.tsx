import { Swords } from "lucide-react";
import Image from "next/image";
import { LinkButton } from "@/components/ui/button";
import { GYMS, SELECTABLE_MODES } from "@/config/gym";
import { messages } from "@/config/messages";

const b = messages.gym.homeBanner;

/** A call to the gym mode from the Pokédex home: who you face and what's in it for you. */
export function GymBanner() {
  const faces = [...SELECTABLE_MODES.map((mode) => GYMS[mode]), GYMS.daily];
  return (
    <aside
      aria-labelledby="gym-banner-title"
      className="border-foreground from-primary-600 to-primary-700 text-on-primary mb-6 flex flex-wrap items-center gap-4 overflow-hidden rounded-3xl border-4 bg-linear-to-r p-4 shadow-[5px_5px_0_0_var(--border)]"
      data-testid="gym-banner"
    >
      <div className="flex shrink-0 items-end -space-x-3" aria-hidden>
        {faces.map((gym) => (
          <div key={gym.name} className="relative h-20 w-12">
            <Image
              src={gym.leaderImage}
              alt=""
              fill
              sizes="48px"
              className="object-contain object-bottom"
            />
          </div>
        ))}
      </div>
      <div className="grid min-w-52 flex-1 gap-1">
        <h2 id="gym-banner-title" className="text-[0.7rem] sm:text-xs">
          {b.title}
        </h2>
        <p className="text-sm">{b.text}</p>
      </div>
      <LinkButton href="/gym" variant="secondary" className="shrink-0">
        <Swords aria-hidden className="size-4" />
        {b.cta}
      </LinkButton>
    </aside>
  );
}
