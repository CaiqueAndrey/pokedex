import Image from "next/image";
import { cn } from "@/components/ui/cn";
import { BALL_IMAGES, type Ball } from "@/config/gym";
import { messages } from "@/config/messages";

/** A pixel-art Pokéball (kept crisp when scaled up). */
export function BallIcon({
  ball,
  className,
  earned = true,
}: {
  ball: Ball;
  className?: string;
  earned?: boolean;
}) {
  return (
    <Image
      src={BALL_IMAGES[ball]}
      alt={messages.gym.balls[ball]}
      width={256}
      height={256}
      className={cn(
        "inline-block size-8 [image-rendering:pixelated]",
        !earned && "opacity-30 grayscale",
        className,
      )}
    />
  );
}
