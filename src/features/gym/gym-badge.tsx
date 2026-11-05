import Image from "next/image";
import { cn } from "@/components/ui/cn";

/**
 * A badge (or any transparent artwork) with a moving shine once earned. The image itself masks the
 * shine, so it follows the badge's shape (the Boulder octagon, the Cascade drop) with no clip path.
 */
export function GymBadge({
  src,
  label,
  earned = true,
  className,
}: {
  src: string;
  label: string;
  earned?: boolean;
  className?: string;
}) {
  const mask = `url(${src}) center / contain no-repeat`;
  return (
    <div
      className={cn(
        "relative aspect-square",
        earned ? "drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)]" : "opacity-30 grayscale",
        className,
      )}
    >
      <Image src={src} alt={label} fill sizes="128px" className="object-contain" />
      {earned && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ mask, WebkitMask: mask }}
        >
          <span className="animate-shine absolute inset-y-0 w-1/3 bg-linear-to-r from-transparent via-white/70 to-transparent" />
        </span>
      )}
    </div>
  );
}
