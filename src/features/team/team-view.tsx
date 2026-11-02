"use client";

import { Plus, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { TypeBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TYPE_LABELS, messages } from "@/config/messages";
import { displayName, formatNumber } from "@/lib/format";
import { spriteUrl } from "@/lib/sprites";
import { sharedWeaknesses, teamCoverage } from "@/lib/type-effectiveness";
import type { PokemonSummary, TypeRelations } from "@/types/pokemon";
import { PokemonPicker } from "../pokedex/pokemon-picker";
import { usePokemonSummaries } from "../pokedex/use-pokemon-summaries";
import { TEAM_SIZE, useTeam } from "./use-team";

const m = messages.team;

export function TeamView({ relations }: { relations: TypeRelations }) {
  const team = useTeam();
  const { results, loading } = usePokemonSummaries(team.names);

  const members = team.names
    .map((name) => results.find((p) => p.name === name))
    .filter((p): p is PokemonSummary => p !== undefined);
  const rows = teamCoverage(
    members.map((p) => p.types),
    relations,
  );
  const shared = sharedWeaknesses(rows);

  return (
    <div className="grid gap-8">
      <section aria-label={m.count(team.names.length)}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium" data-testid="team-count">
            {m.count(team.names.length)}
          </p>
          {team.names.length > 0 && (
            <Button variant="ghost" onClick={team.clear}>
              {m.clear}
            </Button>
          )}
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: TEAM_SIZE }, (_, index) => {
            const name = team.names[index];
            const pokemon = name ? results.find((p) => p.name === name) : undefined;
            if (name && !pokemon && loading) {
              return (
                <li key={index}>
                  <Skeleton className="h-48" />
                </li>
              );
            }
            if (!name || !pokemon) {
              return (
                <li
                  key={index}
                  className="border-border text-muted flex h-48 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed text-sm"
                >
                  <Plus aria-hidden className="size-5" />
                  {m.emptySlot}
                  <span className="sr-only">{m.slot(index + 1)}</span>
                </li>
              );
            }
            return (
              <li key={name}>
                <Card
                  className="relative flex h-48 flex-col items-center p-3"
                  data-testid="team-member"
                >
                  <Button
                    variant="ghost"
                    aria-label={m.remove(displayName(pokemon))}
                    onClick={() => team.remove(name)}
                    className="absolute top-0 right-0 !px-0"
                  >
                    <X aria-hidden className="size-4" />
                  </Button>
                  <Link href={`/pokemon/${pokemon.name}`} className="flex flex-col items-center">
                    <Image
                      src={spriteUrl(pokemon.id, "official")}
                      alt=""
                      width={96}
                      height={96}
                      className="size-24 shrink-0 object-contain"
                    />
                    <span className="text-muted text-xs">{formatNumber(pokemon.speciesId)}</span>
                    <span className="text-sm font-semibold">{displayName(pokemon)}</span>
                  </Link>
                  <div className="mt-auto flex flex-wrap justify-center gap-1">
                    {pokemon.types.map((type) => (
                      <TypeBadge key={type} type={type} />
                    ))}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 max-w-md">
          <PokemonPicker
            label={m.add}
            placeholder={m.addPlaceholder}
            disabled={team.full}
            onSelect={(pokemon) => team.add(pokemon.name)}
          />
          {team.full && <p className="text-muted mt-1 text-sm">{m.full}</p>}
        </div>
      </section>

      <section aria-labelledby="coverage-title">
        <h2 id="coverage-title" className="text-xs">
          {m.coverage}
        </h2>
        <p className="text-muted mb-3 text-sm">{m.coverageHint}</p>
        {members.length === 0 ? (
          <p className="text-muted text-sm">{m.emptyTeam}</p>
        ) : (
          <>
            <p
              role="status"
              className={`mb-3 rounded-xl border p-3 text-sm ${
                shared.length > 0 ? "border-primary-600" : "border-border"
              }`}
            >
              {shared.length > 0
                ? m.shared(shared.map((type) => TYPE_LABELS[type]).join(", "))
                : m.noShared}
            </p>
            <div className="border-border overflow-x-auto rounded-2xl border">
              <table className="w-full text-sm">
                <caption className="sr-only">{m.coverage}</caption>
                <thead className="bg-surface text-left">
                  <tr>
                    <th scope="col" className="p-3">
                      {m.attackType}
                    </th>
                    <th scope="col" className="p-3">
                      {m.weakCol}
                    </th>
                    <th scope="col" className="p-3">
                      {m.resistCol}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.type} className="border-border border-t">
                      <th scope="row" className="p-3 text-left">
                        <TypeBadge type={row.type} />
                      </th>
                      <td
                        className={`p-3 ${row.weak >= 3 ? "bg-primary-600/15 font-bold underline" : ""}`}
                        data-testid={`weak-${row.type}`}
                      >
                        {row.weak}
                      </td>
                      <td className="p-3">{row.resist}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
