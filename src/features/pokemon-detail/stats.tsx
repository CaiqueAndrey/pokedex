import { STAT_LABELS, messages } from "@/config/messages";
import type { PokemonDetail } from "@/types/pokemon";

const MAX_STAT = 255;

export function Stats({ stats }: { stats: PokemonDetail["stats"] }) {
  const total = stats.reduce((sum, stat) => sum + stat.base, 0);
  return (
    <section aria-labelledby="stats-title">
      <h2 id="stats-title" className="mb-3 text-xs">
        {messages.detail.stats}
      </h2>
      <ul className="grid gap-2">
        {stats.map((stat) => (
          <li
            key={stat.name}
            className="grid grid-cols-[7.5rem_2.5rem_1fr] items-center gap-2 text-sm"
          >
            <span className="text-muted">{STAT_LABELS[stat.name]}</span>
            <span className="font-semibold">{stat.base}</span>
            <div
              className="bg-border h-2.5 overflow-hidden rounded-full"
              role="meter"
              aria-label={STAT_LABELS[stat.name]}
              aria-valuemin={0}
              aria-valuemax={MAX_STAT}
              aria-valuenow={stat.base}
            >
              <div
                className="bg-primary-600 h-full rounded-full"
                style={{ width: `${Math.min(100, (stat.base / MAX_STAT) * 100)}%` }}
              />
            </div>
          </li>
        ))}
        <li className="border-border grid grid-cols-[7.5rem_2.5rem_1fr] gap-2 border-t pt-2 text-sm font-semibold">
          <span>{messages.detail.total}</span>
          <span>{total}</span>
        </li>
      </ul>
    </section>
  );
}
