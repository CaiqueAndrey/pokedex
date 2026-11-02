"use client";

import { ArrowLeftRight, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TypeBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { formatNumber } from "@/lib/format";
import type { PokemonTypeName } from "@/types/pokemon";
import { PokemonImage } from "../pokedex/pokemon-image";
import { PokemonPicker } from "../pokedex/pokemon-picker";

export interface CompareSlot {
  name: string;
  label: string;
  id: number;
  speciesId: number;
  artwork: string;
  types: PokemonTypeName[];
}

type Side = "a" | "b";

function SlotCard({
  slot,
  side,
  onClear,
  onPick,
}: {
  slot?: CompareSlot;
  side: Side;
  onClear: () => void;
  onPick: (name: string) => void;
}) {
  const title = side === "a" ? messages.compare.first : messages.compare.second;
  if (!slot) {
    return (
      <div className="border-border flex min-h-64 flex-col justify-center gap-3 rounded-2xl border-2 border-dashed p-4">
        <PokemonPicker
          label={title}
          placeholder={messages.compare.choose}
          onSelect={(pokemon) => onPick(pokemon.name)}
        />
      </div>
    );
  }
  return (
    <div className="border-border bg-surface animate-pop relative flex min-h-64 flex-col items-center gap-1 rounded-2xl border-2 p-4 text-center shadow-[4px_4px_0_0_var(--border)]">
      <button
        type="button"
        onClick={onClear}
        aria-label={`${messages.compare.change}: ${slot.label}`}
        className="hover:bg-border/60 absolute top-1 right-1 inline-flex size-11 items-center justify-center rounded-full"
      >
        <X aria-hidden className="size-5" />
      </button>
      <Link href={`/pokemon/${slot.name}`} className="flex flex-col items-center gap-1">
        <div className="relative size-32 sm:size-40">
          <PokemonImage
            id={slot.id}
            src={slot.artwork}
            alt=""
            sizes="160px"
            priority
            className="animate-float object-contain"
          />
        </div>
        <span className="text-muted font-display text-[0.6rem]">
          {formatNumber(slot.speciesId)}
        </span>
        <span className="font-display text-[0.65rem] leading-relaxed" data-testid={`slot-${side}`}>
          {slot.label}
        </span>
      </Link>
      <div className="flex flex-wrap justify-center gap-1">
        {slot.types.map((type) => (
          <TypeBadge key={type} type={type} />
        ))}
      </div>
    </div>
  );
}

export function ComparePickers({ a, b }: { a?: CompareSlot; b?: CompareSlot }) {
  const router = useRouter();

  function go(next: { a?: string; b?: string }) {
    const params = new URLSearchParams();
    if (next.a) params.set("a", next.a);
    if (next.b) params.set("b", next.b);
    const query = params.toString();
    router.push(query ? `/compare?${query}` : "/compare");
  }

  return (
    <div className="mb-6 grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
      <SlotCard
        slot={a}
        side="a"
        onClear={() => go({ b: b?.name })}
        onPick={(name) => go({ a: name, b: b?.name })}
      />
      <Button
        variant="secondary"
        aria-label={messages.compare.swap}
        disabled={!a || !b}
        onClick={() => go({ a: b?.name, b: a?.name })}
        className="justify-self-center"
      >
        <ArrowLeftRight aria-hidden className="size-4 rotate-90 sm:rotate-0" />
      </Button>
      <SlotCard
        slot={b}
        side="b"
        onClear={() => go({ a: a?.name })}
        onPick={(name) => go({ a: a?.name, b: name })}
      />
    </div>
  );
}
