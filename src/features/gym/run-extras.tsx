"use client";

import { Backpack, Dumbbell, Eye, Gift, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/components/ui/cn";
import { REWARD_ITEMS, type BattleReward, type RewardItemName } from "@/config/gym";
import { messages } from "@/config/messages";
import { evolutionOf, evolveItems } from "@/lib/battle/items";
import { rewardItem, type GymRun } from "@/lib/battle/run";
import { formatName } from "@/lib/format";
import type { BattlePokemon } from "@/types/battle";
import type { GameItem } from "@/types/item";
import { PokemonImage } from "../pokedex/pokemon-image";
import { ItemIcon } from "./item-icon";

const m = messages.gym;
const rw = m.rewards;

const ICONS: Record<BattleReward, typeof Gift> = {
  train: Dumbbell,
  item: Gift,
  evolve: Sparkles,
  scout: Eye,
};

/** Team members as buttons (for training or an evolution), with what happens to each. */
function TargetList({
  team,
  label,
  disabled,
  onPick,
}: {
  team: readonly BattlePokemon[];
  label: (pokemon: BattlePokemon) => string | null;
  disabled?: (pokemon: BattlePokemon) => boolean;
  onPick: (pokemon: BattlePokemon) => void;
}) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {team.map((pokemon) => {
        const text = label(pokemon);
        const off = disabled?.(pokemon) ?? text === null;
        return (
          <li key={pokemon.name}>
            <button
              type="button"
              disabled={off}
              onClick={() => onPick(pokemon)}
              className="border-border hover:bg-border/60 flex min-h-12 w-full items-center gap-2 rounded-xl border-2 p-2 text-left disabled:opacity-40"
              data-testid="reward-target"
            >
              <span className="relative size-10 shrink-0">
                <PokemonImage id={pokemon.id} alt="" sizes="40px" />
              </span>
              <span className="grid gap-0.5">
                <span className="font-display text-[0.6rem] leading-relaxed">
                  {formatName(pokemon.name)}
                </span>
                {text && <span className="text-xs">{text}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * After a won battle (before the next one): choose one of three rewards, or skip. Training and the
 * Rare Candy then ask which Pokémon.
 */
export function RewardPicker({
  run,
  team,
  pool,
  items,
  onChoose,
}: {
  run: GymRun;
  team: BattlePokemon[];
  pool: BattlePokemon[];
  items: GameItem[];
  onChoose: (kind: BattleReward | undefined, target?: string) => void;
}) {
  const [step, setStep] = useState<"train" | "evolve" | null>(null);
  const options = run.reward?.options ?? [];
  const item = rewardItem(run, run.battle);
  const itemName = REWARD_ITEMS[item];
  const sprite = items.find((i) => i.name === item);
  const canEvolve = team.some((p) => evolutionOf(p, pool));

  return (
    <section
      aria-labelledby="reward-title"
      className="animate-fade-up grid gap-3 rounded-3xl border-2 border-amber-500 bg-amber-500/10 p-3"
      data-testid="battle-reward"
    >
      <div className="grid gap-1">
        <h2 id="reward-title" className="text-[0.65rem] leading-relaxed sm:text-xs">
          {rw.title}
        </h2>
        <p className="text-sm">{step ? rw.pickTarget : rw.hint}</p>
      </div>
      {step === null ? (
        <ul className="grid gap-2 sm:grid-cols-3">
          {options.map((kind) => {
            const Icon = ICONS[kind];
            const disabled = kind === "evolve" && !canEvolve;
            const text =
              kind === "item"
                ? rw.item.text(itemName)
                : kind === "evolve" && disabled
                  ? rw.evolve.none
                  : rw[kind].text;
            return (
              <li key={kind}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    kind === "train" || kind === "evolve" ? setStep(kind) : onChoose(kind)
                  }
                  className={cn(
                    "border-border bg-surface hover:bg-border/60 grid h-full w-full content-start gap-1 rounded-2xl border-2 p-3 text-left disabled:opacity-50",
                  )}
                  data-testid={`reward-${kind}`}
                >
                  <span className="font-display flex items-center gap-2 text-[0.6rem]">
                    {kind === "item" && sprite ? (
                      <ItemIcon item={sprite} className="size-6" />
                    ) : (
                      <Icon aria-hidden className="size-4" />
                    )}
                    {rw[kind].label}
                  </span>
                  <span className="text-sm">{text}</span>
                  {kind === "item" && run.practice && (
                    <span className="text-muted text-xs">{rw.practiceItem}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <TargetList
          team={team}
          label={(pokemon) => {
            if (step === "train") return run.boosts.includes(pokemon.name) ? rw.trained : null;
            const next = evolutionOf(pokemon, pool);
            return next ? `→ ${formatName(next.name)}` : null;
          }}
          disabled={(pokemon) =>
            step === "train"
              ? run.boosts.includes(pokemon.name)
              : evolutionOf(pokemon, pool) === undefined
          }
          onPick={(pokemon) => onChoose(step, pokemon.name)}
        />
      )}
      <div className="flex flex-wrap gap-2">
        {step ? (
          <Button variant="ghost" onClick={() => setStep(null)}>
            {rw.back}
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => onChoose(undefined)}>
            <X aria-hidden className="size-4" />
            {rw.skip}
          </Button>
        )}
      </div>
    </section>
  );
}

/**
 * The bag in a run: evolve a team member with a stone or a Rare Candy (between battles). Spends the
 * item. Practice runs can't use the bag.
 */
export function BagButton({
  run,
  team,
  pool,
  bag,
  items,
  onUse,
}: {
  run: GymRun;
  team: BattlePokemon[];
  pool: BattlePokemon[];
  bag: Record<string, number>;
  items: GameItem[];
  onUse: (item: RewardItemName, member: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const usable = run.practice ? [] : evolveItems(bag, team, pool);
  const count = usable.reduce((sum, item) => sum + (bag[item] ?? 0), 0);
  if (count === 0) return null;
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} data-testid="bag-button">
        <Backpack aria-hidden className="size-4" />
        {m.bag.open(count)}
      </Button>
      {open && (
        <Dialog open title={m.bag.title} onClose={() => setOpen(false)} testId="bag-dialog">
          <p className="text-muted mb-3 text-sm">{m.bag.hint}</p>
          <ul className="grid gap-2">
            {usable.flatMap((item) =>
              team.flatMap((member) => {
                const next = evolutionOf(member, pool, item);
                if (!next) return [];
                const sprite = items.find((i) => i.name === item);
                return [
                  <li key={`${item}-${member.name}`}>
                    <button
                      type="button"
                      onClick={() => {
                        onUse(item, member.name);
                        setOpen(false);
                      }}
                      className="border-border hover:bg-border/60 flex min-h-12 w-full items-center gap-2 rounded-xl border-2 p-2 text-left text-sm"
                      data-testid="bag-use"
                    >
                      {sprite && <ItemIcon item={sprite} className="size-8" />}
                      {m.bag.use(
                        `${REWARD_ITEMS[item]} (${bag[item] ?? 0})`,
                        formatName(member.name),
                        formatName(next.name),
                      )}
                    </button>
                  </li>,
                ];
              }),
            )}
          </ul>
          <div className="mt-4 flex justify-center">
            <Button variant="secondary" onClick={() => setOpen(false)} autoFocus>
              {m.bag.close}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
