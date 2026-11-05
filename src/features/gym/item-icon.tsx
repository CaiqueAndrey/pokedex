import Image from "next/image";
import { cn } from "@/components/ui/cn";
import { REWARD_ITEMS } from "@/config/gym";
import type { GameItem } from "@/types/item";

/** A PokeAPI item sprite (tiny pixel art, served as is). */
export function ItemIcon({
  item,
  className,
  earned = true,
}: {
  item: GameItem;
  className?: string;
  earned?: boolean;
}) {
  const label = REWARD_ITEMS[item.name as keyof typeof REWARD_ITEMS] ?? item.name;
  if (!item.sprite) return null;
  return (
    <Image
      src={item.sprite}
      alt={label}
      width={30}
      height={30}
      unoptimized
      className={cn(
        "inline-block size-7 [image-rendering:pixelated]",
        !earned && "opacity-30 grayscale",
        className,
      )}
    />
  );
}
