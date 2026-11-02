import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { messages } from "@/config/messages";
import { formatName, formatNumber } from "@/lib/format";
import { spriteUrl } from "@/lib/sprites";
import type { EvolutionNode } from "@/types/pokemon";

function Node({ node, current }: { node: EvolutionNode; current: string }) {
  const isCurrent = node.name === current;
  return (
    <li className="flex flex-col items-center gap-3 md:flex-row">
      <div className="flex flex-col items-center gap-2 md:flex-row">
        {node.trigger && (
          <span className="text-muted flex items-center gap-1 text-center text-xs">
            <ArrowRight aria-hidden className="size-4 rotate-90 md:rotate-0" />
            {node.trigger}
          </span>
        )}
        <Link
          href={`/pokemon/${node.name}`}
          aria-current={isCurrent ? "page" : undefined}
          className={cn(
            "hover:bg-border/40 flex w-28 flex-col items-center rounded-2xl border p-2 text-center",
            isCurrent ? "border-primary-600 bg-surface" : "border-border",
          )}
        >
          <Image
            src={spriteUrl(node.id)}
            alt=""
            width={96}
            height={96}
            className="size-24 shrink-0 object-contain"
          />
          <span className="text-muted text-xs">{formatNumber(node.id)}</span>
          <span className="text-sm font-semibold">{formatName(node.name)}</span>
        </Link>
      </div>
      {node.evolvesTo.length > 0 && (
        <ul className="flex flex-col gap-3">
          {node.evolvesTo.map((child) => (
            <Node key={child.name} node={child} current={current} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function EvolutionChain({ chain, current }: { chain: EvolutionNode; current: string }) {
  return (
    <section aria-labelledby="evolution-title">
      <h2 id="evolution-title" className="mb-3 text-xs">
        {messages.detail.evolutions}
      </h2>
      {chain.evolvesTo.length === 0 ? (
        <p className="text-muted text-sm">{messages.detail.noEvolutions}</p>
      ) : (
        <ul className="overflow-x-auto pb-2">
          <Node node={chain} current={current} />
        </ul>
      )}
    </section>
  );
}
