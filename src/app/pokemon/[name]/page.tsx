import { ChevronLeft, ChevronRight, Scale } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TypeBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { generationLabel, messages } from "@/config/messages";
import { TYPE_STYLES } from "@/config/pokemon-types";
import { FavoriteButton } from "@/features/favorites/favorite-button";
import { ArtworkViewer } from "@/features/pokemon-detail/artwork-viewer";
import { EvolutionChain } from "@/features/pokemon-detail/evolution-chain";
import { FormsSelector } from "@/features/pokemon-detail/forms-selector";
import { GameFacts } from "@/features/pokemon-detail/game-facts";
import { Stats } from "@/features/pokemon-detail/stats";
import { TypeEffectiveness } from "@/features/pokemon-detail/type-effectiveness";
import { TeamButton } from "@/features/team/team-button";
import { displayName, formatName, formatNumber } from "@/lib/format";
import { getPokedex } from "@/server/pokedex/next-cache";
import { cache } from "react";

type Props = { params: Promise<{ name: string }> };

// Deduplicates the lookup between generateMetadata and the page within one request.
const loadDetail = cache((name: string) => getPokedex().getPokemonDetail(name));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const detail = await loadDetail(decodeURIComponent(name)).catch(() => null);
  if (!detail) return { title: messages.errors.notFoundTitle };
  const title = `${displayName(detail)} ${formatNumber(detail.speciesId)}`;
  const types = detail.types.map((type) => TYPE_STYLES[type].label).join(" / ");
  return {
    title,
    description: `${title} — ${types}. ${detail.flavorText}`.trim(),
  };
}

export default async function PokemonPage({ params }: Props) {
  const { name } = await params;
  const pokedex = getPokedex();
  const detail = await loadDetail(decodeURIComponent(name));
  if (!detail) notFound();

  const [chain, relations, all] = await Promise.all([
    pokedex.getEvolutionChain(detail.evolutionChainId),
    pokedex.getTypeRelations(),
    pokedex.listPokemon(),
  ]);

  const defaults = all.filter((p) => p.isDefault);
  const previous = defaults.find((p) => p.speciesId === detail.speciesId - 1);
  const next = defaults.find((p) => p.speciesId === detail.speciesId + 1);
  const title = displayName(detail);
  const primary = TYPE_STYLES[detail.types[0]];

  return (
    <article>
      <div className="mb-4 flex items-center justify-between gap-2">
        <LinkButton href="/" variant="ghost" className="-ml-2">
          <ChevronLeft aria-hidden className="size-4" />
          {messages.detail.back}
        </LinkButton>
        <div className="flex gap-1">
          {previous && (
            <Link
              href={`/pokemon/${previous.name}`}
              aria-label={`${messages.detail.previous}: ${formatName(previous.speciesName)}`}
              className="hover:bg-border/60 inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm"
            >
              <ChevronLeft aria-hidden className="size-4" />
              <span className="hidden sm:inline">{formatNumber(previous.speciesId)}</span>
            </Link>
          )}
          {next && (
            <Link
              href={`/pokemon/${next.name}`}
              aria-label={`${messages.detail.next}: ${formatName(next.speciesName)}`}
              className="hover:bg-border/60 inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm"
            >
              <span className="hidden sm:inline">{formatNumber(next.speciesId)}</span>
              <ChevronRight aria-hidden className="size-4" />
            </Link>
          )}
        </div>
      </div>

      <header
        className="border-border mb-6 rounded-3xl border p-4 sm:p-6"
        style={{
          background: `linear-gradient(160deg, color-mix(in srgb, ${primary.color} 30%, var(--surface)) 0%, var(--surface) 75%)`,
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-muted text-sm font-semibold">{formatNumber(detail.speciesId)}</p>
            <h1 className="text-xl sm:text-2xl">{title}</h1>
            {detail.genus && <p className="text-muted text-sm">{detail.genus}</p>}
            <div className="mt-3 flex flex-wrap gap-1">
              {detail.types.map((type) => (
                <TypeBadge key={type} type={type} />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FavoriteButton name={detail.name} label={title} className="border-border border" />
            <TeamButton name={detail.name} />
            <LinkButton
              href={`/compare?a=${encodeURIComponent(detail.name)}`}
              variant="secondary"
              data-testid="compare-with"
            >
              <Scale aria-hidden className="size-4" />
              {messages.facts.compareWith}
            </LinkButton>
          </div>
        </div>
        <div className="mt-4 grid items-center gap-6 md:grid-cols-2">
          <ArtworkViewer id={detail.id} name={title} artwork={detail.artwork} cry={detail.cry} />
          <div className="grid gap-4">
            {detail.flavorText && <p className="text-base leading-relaxed">{detail.flavorText}</p>}
            {detail.isDefault && <GameFacts id={detail.speciesId} name={detail.name} />}
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-background/70 rounded-xl p-3">
                <dt className="text-muted">{messages.detail.height}</dt>
                <dd className="text-lg font-semibold">
                  {detail.heightM.toLocaleString("pt-BR")} m
                </dd>
              </div>
              <div className="bg-background/70 rounded-xl p-3">
                <dt className="text-muted">{messages.detail.weight}</dt>
                <dd className="text-lg font-semibold">
                  {detail.weightKg.toLocaleString("pt-BR")} kg
                </dd>
              </div>
              <div className="bg-background/70 col-span-2 rounded-xl p-3">
                <dt className="text-muted">{messages.detail.abilities}</dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {detail.abilities.map((ability) => (
                    <span
                      key={ability.name}
                      className="border-border rounded-full border px-3 py-0.5 font-medium"
                    >
                      {formatName(ability.name)}
                      {ability.hidden && (
                        <span className="text-muted"> ({messages.detail.hidden})</span>
                      )}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
            <p className="text-muted text-sm">{generationLabel(detail.generation)}</p>
          </div>
        </div>
      </header>

      <FormsSelector varieties={detail.varieties} current={detail.name} />

      <div className="grid gap-8 md:grid-cols-2">
        <Stats stats={detail.stats} />
        <TypeEffectiveness types={detail.types} relations={relations} />
      </div>
      {chain && (
        <div className="mt-8">
          <EvolutionChain chain={chain} current={detail.speciesName} />
        </div>
      )}
    </article>
  );
}
