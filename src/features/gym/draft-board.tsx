"use client";

import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TYPE_LABELS, messages } from "@/config/messages";
import {
  DRAFT_ROUNDS,
  GYMS,
  MAX_BONUS_REROLLS,
  REWARD_ITEMS,
  TEAM_SIZE,
  type RewardItemName,
} from "@/config/gym";
import { cn } from "@/components/ui/cn";
import { TYPE_STYLES } from "@/config/pokemon-types";
import { rerollItems } from "@/lib/battle/items";
import { currentDraft, rerollsLeft, type GymRun } from "@/lib/battle/run";
import { budgetPlan } from "@/lib/battle/team";
import { formatName } from "@/lib/format";
import { sharedWeaknesses, teamCoverage } from "@/lib/type-effectiveness";
import type { BattlePokemon } from "@/types/battle";
import type { TypeRelations } from "@/types/pokemon";
import { useFavorites } from "../favorites/use-favorites";
import { PokemonImage } from "../pokedex/pokemon-image";
import { BallIcon } from "./ball-icon";
import { GymPokemon } from "./gym-pokemon";
import { Tip } from "./tip";

const m = messages.gym;

export function DraftBoard({
  run,
  pool,
  team,
  relations,
  onPick,
  onReroll,
  bag = {},
  onBuyReroll,
}: {
  run: GymRun;
  pool: BattlePokemon[];
  team: BattlePokemon[];
  relations: TypeRelations;
  onPick: (name: string) => void;
  onReroll: () => void;
  /** The bag, for valuables that buy a reroll (empty in practice runs). */
  bag?: Record<string, number>;
  onBuyReroll?: (item: RewardItemName) => void;
}) {
  const round = currentDraft(run, pool);
  const { names: favorites } = useFavorites();
  // A mode without a cap (budget null) hides the panel and the per-offer budget lines.
  const { player: budget, reveal } = GYMS[run.mode].rules;
  const plan = budget === null ? null : budgetPlan(team, pool, budget);
  const pct = (value: number) => `${(value / (budget ?? 1)) * 100}%`;
  const typesCovered = new Set(team.flatMap((p) => p.types));
  const left = rerollsLeft(run);
  const valuable =
    left <= 0 && run.bonusRerolls < MAX_BONUS_REROLLS ? rerollItems(bag)[0] : undefined;
  const die = TYPE_STYLES[round.type];
  const shared =
    team.length > 1
      ? sharedWeaknesses(
          teamCoverage(
            team.map((p) => p.types),
            relations,
          ),
        )
      : [];

  return (
    <div className="grid gap-5">
      <section aria-labelledby="draft-title" className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h2 id="draft-title" className="text-xs sm:text-sm">
            {m.draftTitle(run.picks.length + 1, DRAFT_ROUNDS)}
          </h2>
          {valuable && onBuyReroll ? (
            <Button variant="secondary" onClick={() => onBuyReroll(valuable)}>
              <Dices aria-hidden className="size-4" />
              {m.bag.reroll(REWARD_ITEMS[valuable])}
            </Button>
          ) : (
            <Button variant="secondary" disabled={left <= 0} onClick={onReroll}>
              <Dices aria-hidden className="size-4" />
              {m.reroll} ({m.rerollLeft(left)})
            </Button>
          )}
        </div>

        {round.legendary ? (
          <div
            className="flex items-center gap-4 rounded-2xl border-2 border-amber-500 bg-amber-500/10 p-3"
            aria-live="polite"
            data-testid="legendary-round"
          >
            <BallIcon ball="master" className="motion-safe:animate-pop size-14" />
            <div className="grid gap-1">
              <p className="font-display text-[0.65rem]">{m.legendaryRound}</p>
              <p className="text-sm">{m.legendaryRoundHint}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3" aria-live="polite">
            <div
              key={`${run.picks.length}-${run.rerollsUsed}`}
              className="animate-pop font-display flex size-12 shrink-0 items-center justify-center rounded-xl border-4 border-black/20 text-[0.5rem] shadow-[3px_3px_0_0_var(--border)] motion-safe:animate-[spin_0.6s_ease-out]"
              style={{ backgroundColor: die.color, color: die.textColor }}
              aria-hidden
            >
              {die.label}
            </div>
            <p className="text-base" data-testid="die-result">
              {m.rolledType(TYPE_LABELS[round.type])}
            </p>
          </div>
        )}

        {run.picks.length === 0 && <Tip id="draft" />}

        {/* The offers come first: they are the decision. The budget explains them, below. */}
        <ul className="grid gap-2 sm:grid-cols-3 sm:gap-3">
          {round.offers.map((offer, index) => {
            const blocked = round.blocked.includes(offer.name);
            return (
              <li
                key={offer.name}
                className="animate-fade-up"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <GymPokemon
                  pokemon={offer}
                  showStats={reveal}
                  row
                  className={cn("h-full", blocked && "opacity-60 grayscale")}
                >
                  {favorites.includes(offer.name) && (
                    <span className="text-primary-600 text-xs font-bold" data-testid="favorite-tag">
                      {m.favoriteTag}
                    </span>
                  )}
                  {plan && budget !== null && (
                    <span
                      className={cn("text-xs", blocked ? "font-bold" : "text-muted")}
                      data-testid="budget-after"
                    >
                      {blocked
                        ? m.overBudget(offer.bst - plan.free)
                        : m.budgetAfter(budget - plan.used - offer.bst)}
                    </span>
                  )}
                  {!offer.types.some((t) => typesCovered.has(t)) && team.length > 0 && (
                    <span className="text-xs font-bold" data-testid="new-type">
                      {m.newType}
                    </span>
                  )}
                  <Button
                    className="mt-2 w-full sm:mt-3"
                    disabled={blocked}
                    onClick={() => onPick(offer.name)}
                    aria-label={
                      blocked
                        ? m.chooseBlocked(formatName(offer.name))
                        : m.choose(formatName(offer.name))
                    }
                  >
                    {blocked ? m.blocked : m.pick}
                  </Button>
                </GymPokemon>
              </li>
            );
          })}
        </ul>

        {plan && budget !== null ? (
          <div
            className="border-border bg-surface grid gap-2 rounded-2xl border-2 p-3"
            data-testid="budget-panel"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="font-display text-[0.6rem]" data-testid="budget">
                {m.budget(plan.used, budget)}
              </span>
              <span className="text-sm">{m.budgetMaxNext(plan.free)}</span>
            </div>
            <div className="bg-border flex h-3 overflow-hidden rounded-full" aria-hidden>
              <div
                className="from-primary-600 h-full bg-linear-to-r to-amber-500 transition-all duration-500"
                style={{ width: pct(plan.used) }}
              />
              <div
                className="h-full bg-[repeating-linear-gradient(45deg,var(--muted)_0_6px,transparent_6px_12px)] opacity-60 transition-all duration-500"
                style={{ width: pct(plan.reserved) }}
              />
            </div>
            <details>
              <summary className="text-muted cursor-pointer text-sm">{m.budgetHow}</summary>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <li className="flex items-center gap-1">
                  <span
                    aria-hidden
                    className="from-primary-600 size-3 rounded-sm bg-linear-to-r to-amber-500"
                  />
                  {m.budgetLegendUsed}: {plan.used}
                </li>
                <li className="flex items-center gap-1">
                  <span
                    aria-hidden
                    className="size-3 rounded-sm bg-[repeating-linear-gradient(45deg,var(--muted)_0_3px,transparent_3px_6px)]"
                  />
                  {m.budgetLegendReserved}: {plan.reserved}
                </li>
                <li className="flex items-center gap-1">
                  <span aria-hidden className="bg-border size-3 rounded-sm" />
                  {m.budgetLegendFree}: {plan.free}
                </li>
              </ul>
              <p className="text-muted mt-2 text-sm">{m.budgetHelp}</p>
            </details>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="team-title" className="grid gap-2">
        <h2 id="team-title" className="text-xs">
          {m.teamCount(team.length, TEAM_SIZE)}
        </h2>
        <ul className="grid grid-cols-6 gap-1 sm:gap-2">
          {Array.from({ length: TEAM_SIZE }, (_, i) => {
            const member = team[i];
            return (
              <li key={member?.name ?? `slot-${i}`}>
                {member ? (
                  <div
                    className="border-border bg-surface animate-pop relative aspect-square rounded-xl border-2"
                    title={formatName(member.name)}
                    data-testid="team-slot"
                  >
                    <PokemonImage id={member.id} alt={formatName(member.name)} sizes="80px" />
                  </div>
                ) : (
                  <div className="border-border text-muted flex aspect-square items-center justify-center rounded-xl border-2 border-dashed text-xs">
                    <span className="sr-only">{m.emptySlot}</span> {i + 1}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {team.length > 1 && (
          <p className="text-sm" role="status">
            {shared.length > 0
              ? m.sharedWeakness(shared.map((t) => TYPE_LABELS[t]).join(", "))
              : m.noSharedWeakness}
          </p>
        )}
      </section>
    </div>
  );
}
