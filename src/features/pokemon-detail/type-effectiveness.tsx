import { TypeBadge } from "@/components/ui/badge";
import { messages } from "@/config/messages";
import { computeMatchups, groupMatchups } from "@/lib/type-effectiveness";
import type { PokemonTypeName, TypeRelations } from "@/types/pokemon";

export function TypeEffectiveness({
  types,
  relations,
}: {
  types: readonly PokemonTypeName[];
  relations: TypeRelations;
}) {
  const groups = groupMatchups(computeMatchups(types, relations));
  const rows = [
    [messages.detail.weak4, groups.weak4],
    [messages.detail.weak2, groups.weak2],
    [messages.detail.resist, groups.resist],
    [messages.detail.resist4, groups.resist4],
    [messages.detail.immune, groups.immune],
  ] as const;

  return (
    <section aria-labelledby="effectiveness-title">
      <h2 id="effectiveness-title" className="mb-3 text-xs">
        {messages.detail.weaknesses}
      </h2>
      <dl className="grid gap-3">
        {rows.map(([label, list]) => (
          <div key={label}>
            <dt className="text-muted mb-1 text-sm">{label}</dt>
            <dd className="flex flex-wrap gap-1">
              {list.length === 0 ? (
                <span className="text-muted text-sm">{messages.detail.none}</span>
              ) : (
                list.map((type) => <TypeBadge key={type} type={type} />)
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
