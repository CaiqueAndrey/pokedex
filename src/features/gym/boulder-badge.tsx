import Image from "next/image";
import { cn } from "@/components/ui/cn";

/** The Boulder Badge artwork, with a moving shine once earned. */
export function BoulderBadge({
  className,
  earned = true,
  label,
}: {
  className?: string;
  earned?: boolean;
  label: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden [clip-path:polygon(20%_2%,62%_0%,92%_17%,100%_57%,80%_90%,47%_100%,14%_83%,0%_45%)]",
        earned ? "drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)]" : "opacity-30 grayscale",
        className,
      )}
    >
      <Image
        src="/img/insignia_rock.webp"
        alt={label}
        fill
        sizes="128px"
        className="object-contain"
      />
      {earned && (
        <span
          aria-hidden
          className="animate-shine pointer-events-none absolute inset-y-0 w-1/3 bg-linear-to-r from-transparent via-white/70 to-transparent"
        />
      )}
    </div>
  );
}
