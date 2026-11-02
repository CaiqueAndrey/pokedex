import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { STAT_LABELS, messages } from "@/config/messages";
import { ComparePickers, type CompareSlot } from "@/features/compare/compare-pickers";
import { displayName } from "@/lib/format";
import { getPokedex } from "@/server/pokedex/next-cache";
import { STAT_NAMES, type PokemonDetail } from "@/types/pokemon";

export const metadata: Metadata = { title: messages.compare.title };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const single = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.slice(0, 80) || undefined;

const toSlot = (pokemon: PokemonDetail | null | undefined): CompareSlot | undefined =>
  pokemon
    ? {
        name: pokemon.name,
        label: displayName(pokemon),
        id: pokemon.id,
        speciesId: pokemon.speciesId,
        artwork: pokemon.artwork.default,
        types: pokemon.types,
      }
    : undefined;

export default async function ComparePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const nameA = single(params.a);
  const nameB = single(params.b);
  const pokedex = getPokedex();
  const [a, b] = await Promise.all([
    nameA ? pokedex.getPokemonDetail(nameA) : null,
    nameB ? pokedex.getPokemonDetail(nameB) : null,
  ]);

  const stat = (pokemon: PokemonDetail, name: (typeof STAT_NAMES)[number]) =>
    pokemon.stats.find((s) => s.name === name)?.base ?? 0;
  const total = (pokemon: PokemonDetail) => pokemon.stats.reduce((sum, s) => sum + s.base, 0);

  return (
    <>
      <PageHeader title={messages.compare.title} description={messages.compare.description} />
      <ComparePickers a={toSlot(a)} b={toSlot(b)} />
      {nameA && !a && <p className="mb-3 text-sm">{messages.compare.notFound(nameA)}</p>}
      {nameB && !b && <p className="mb-3 text-sm">{messages.compare.notFound(nameB)}</p>}
      {a && b && (
        <div className="border-border bg-surface animate-fade-up rounded-2xl border-2 p-4 shadow-[4px_4px_0_0_var(--border)]">
          <table className="w-full text-sm">
            <caption className="sr-only">{messages.compare.title}</caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">{displayName(a)}</th>
                <th scope="col">Atributo</th>
                <th scope="col">{displayName(b)}</th>
              </tr>
            </thead>
            <tbody>
              {[...STAT_NAMES, "total" as const].map((name) => {
                const isTotal = name === "total";
                const left = isTotal ? total(a) : stat(a, name);
                const right = isTotal ? total(b) : stat(b, name);
                const max = isTotal ? 780 : 255;
                const label = isTotal ? messages.detail.total : STAT_LABELS[name];
                const cell = (value: number, other: number) =>
                  `py-2 text-center text-base ${value > other ? "bg-primary-600/15 font-bold" : ""}`;
                const bar = (value: number, other: number, align: "end" | "start") => (
                  <div
                    aria-hidden
                    className={`bg-border/60 mx-auto mt-1 flex h-1.5 w-full overflow-hidden rounded-full ${align === "end" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`h-full rounded-full ${value > other ? "from-primary-600 bg-linear-to-r to-amber-500" : "bg-muted/60"}`}
                      style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
                    />
                  </div>
                );
                return (
                  <tr key={name} className="border-border border-t">
                    <td className={cell(left, right)} data-testid={`cmp-a-${name}`}>
                      {left}
                      {left > right && (
                        <span className="sr-only"> ({messages.compare.winner})</span>
                      )}
                      {bar(left, right, "end")}
                    </td>
                    <th
                      scope="row"
                      className="text-muted px-2 py-2 text-center text-xs font-normal"
                    >
                      {label}
                    </th>
                    <td className={cell(right, left)} data-testid={`cmp-b-${name}`}>
                      {right}
                      {right > left && (
                        <span className="sr-only"> ({messages.compare.winner})</span>
                      )}
                      {bar(right, left, "start")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
