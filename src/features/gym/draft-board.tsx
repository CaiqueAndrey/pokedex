"use client";

import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TYPE_LABELS, messages } from "@/config/messages";
import { DRAFT_ROUNDS, MODE_BUDGETS, REROLLS_PER_RUN, TEAM_SIZE } from "@/config/gym";
import { cn } from "@/components/ui/cn";
import { TYPE_STYLES } from "@/config/pokemon-types";
import { currentDraft, type GymRun } from "@/lib/battle/run";
import { budgetPlan } from "@/lib/battle/team";
import { formatName } from "@/lib/format";
import { sharedWeaknesses, teamCoverage } from "@/lib/type-effectiveness";
import type { BattlePokemon } from "@/types/battle";
import type { TypeRelations } from "@/types/pokemon";
import { GymPokemon } from "./gym-pokemon";

const m = messages.gym;

export function DraftBoard({
  run,
  pool,
  team,
  relations,
  onPick,
  onReroll,
}: {
  run: GymRun;
  pool: BattlePokemon[];
  team: BattlePokemon[];
  relations: TypeRelations;
  onPick: (name: string) => void;
  onReroll: () => void;
}) {
  const round = currentDraft(run, pool);
  // Easy mode has no cap (budget null): the panel and the per-offer budget lines are hidden.
  const budget = MODE_BUDGETS[run.mode].player;
  const plan = budget === null ? null : budgetPlan(team, pool, budget);
  const pct = (value: number) => `${(value / (budget ?? 1)) * 100}%`;
  const typesCovered = new Set(team.flatMap((p) => p.types));
  const rerollsLeft = REROLLS_PER_RUN - run.rerollsUsed;
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
    <div className="grid gap-6">
      <section aria-labelledby="draft-title" className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="draft-title" className="text-xs sm:text-sm">
            {m.draftTitle(run.picks.length + 1, DRAFT_ROUNDS)}
          </h2>
          <Button variant="secondary" disabled={rerollsLeft <= 0} onClick={onReroll}>
            <Dices aria-hidden className="size-4" />
            {m.reroll} ({m.rerollLeft(rerollsLeft)})
          </Button>
        </div>

        <div className="flex items-center gap-4" aria-live="polite">
          <div
            key={`${run.picks.length}-${run.rerollsUsed}`}
            className="animate-pop font-display flex size-16 shrink-0 items-center justify-center rounded-xl border-4 border-black/20 text-[0.55rem] shadow-[4px_4px_0_0_var(--border)] motion-safe:animate-[spin_0.6s_ease-out]"
            style={{ backgroundColor: die.color, color: die.textColor }}
            aria-hidden
          >
            {die.label}
          </div>
          <p className="text-base" data-testid="die-result">
            {m.rolledType(TYPE_LABELS[round.type])}
          </p>
        </div>

        {plan && budget !== null ? (
          <div
            className="border-border bg-surface grid gap-2 rounded-2xl border-2 p-3"
            data-testid="budget-panel"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-display text-[0.6rem]" data-testid="budget">
                {m.budget(plan.used, budget)}
              </span>
              <span className="text-sm">{m.budgetMaxNext(plan.free)}</span>
            </div>
            <div className="bg-border flex h-4 overflow-hidden rounded-full" aria-hidden>
              <div
                className="from-primary-600 h-full bg-linear-to-r to-amber-500 transition-all duration-500"
                style={{ width: pct(plan.used) }}
              />
              <div
                className="h-full bg-[repeating-linear-gradient(45deg,var(--muted)_0_6px,transparent_6px_12px)] opacity-60 transition-all duration-500"
                style={{ width: pct(plan.reserved) }}
              />
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
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
            <p className="text-muted text-sm">{m.budgetHelp}</p>
          </div>
        ) : (
          <p className="text-muted text-sm" data-testid="easy-hint">
            {m.easyDraftHint}
          </p>
        )}

        <ul className="grid gap-3 sm:grid-cols-3">
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
                  showStats={run.mode === "easy"}
                  className={cn("h-full", blocked && "opacity-60 grayscale")}
                >
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
                    className="mt-3 w-full"
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
      </section>

      <section aria-labelledby="team-title" className="grid gap-3">
        <h2 id="team-title" className="text-xs">
          {m.yourTeam}
        </h2>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {Array.from({ length: TEAM_SIZE }, (_, i) => {
            const member = team[i];
            return (
              <li key={member?.name ?? `slot-${i}`}>
                {member ? (
                  <GymPokemon pokemon={member} compact showTypes className="animate-pop" />
                ) : (
                  <div className="border-border text-muted flex h-full min-h-24 items-center justify-center rounded-2xl border-2 border-dashed text-sm">
                    {m.emptySlot} {i + 1}
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
