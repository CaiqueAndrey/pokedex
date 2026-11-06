"use client";

import { ArrowDown, ArrowUp, Check, Dumbbell, Swords, Trophy, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ActionBar } from "@/components/ui/action-bar";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { InfoTip } from "@/components/ui/info-tip";
import { Skeleton } from "@/components/ui/skeleton";
import { REWARD_ITEMS, ROCKET_PUZZLE } from "@/config/gym";
import { messages } from "@/config/messages";
import { formatDailyDate } from "@/lib/battle/progress";
import {
  addAttempt,
  attemptBattle,
  calibrate,
  rocketGrid,
  rocketShareText,
  toAttempt,
  type RocketAttempt,
  type RocketDay,
} from "@/lib/battle/puzzle";
import { teamBst } from "@/lib/battle/team";
import { formatName } from "@/lib/format";
import type { BattlePokemon, BattleResult } from "@/types/battle";
import type { GameItem } from "@/types/item";
import type { TypeRelations } from "@/types/pokemon";
import { useFavorites } from "../favorites/use-favorites";
import { markDex } from "../pokedex/use-dex-progress";
import { BallIcon } from "./ball-icon";
import { BattleView } from "./battle-view";
import { GymPokemon } from "./gym-pokemon";
import { ItemIcon } from "./item-icon";
import { RocketDuo } from "./run-result-dialog";
import { ShareButton } from "./share-button";
import { Tip } from "./tip";
import {
  recordRocketAttempt,
  sfx,
  useRocketProgress,
  useToday,
  useTrainer,
  type RocketOutcome,
} from "./use-gym";

const m = messages.gym;
const r = m.rocket;
const { attempts: MAX_ATTEMPTS, cap: CAP, pick: PICK } = ROCKET_PUZZLE;

interface Replay {
  result: BattleResult;
  team: BattlePokemon[];
  number: number;
}

function AttemptList({ attempts, total }: { attempts: readonly RocketAttempt[]; total: number }) {
  if (attempts.length === 0) return null;
  const grid = rocketGrid(attempts, total);
  return (
    <section aria-labelledby="attempts-title" className="grid gap-2">
      <h2 id="attempts-title" className="text-[0.65rem]">
        {r.attemptsTitle}
      </h2>
      <ol className="grid gap-2">
        {attempts.map((attempt, index) => (
          <li
            key={index}
            className="border-border bg-surface grid gap-1 rounded-2xl border-2 p-2 text-sm"
            data-testid="rocket-attempt"
          >
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-display text-[0.6rem]">
                {r.attempt(index + 1, MAX_ATTEMPTS)}
              </span>
              <span aria-hidden>{grid[index]}</span>
              <span className="font-bold">
                {attempt.won ? r.attemptWon : r.attemptLost(attempt.knocked, total)}
              </span>
            </p>
            <p className="text-muted">
              {attempt.order.map(formatName).join(" → ")}
              {!attempt.won && attempt.nemesis && ` · ${r.nemesis(formatName(attempt.nemesis))}`}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * The daily Team Rocket ambush: Jessie and James's team is in the open; pick three from the day's
 * hand, in order, and win within three attempts. Today's attempts are saved and pay out; past days
 * (and today after it's over, on request) are practice.
 */
export function RocketAmbush({
  pool,
  relations,
  items,
  day,
}: {
  pool: BattlePokemon[];
  relations: TypeRelations;
  items: GameItem[];
  /** A past day from the archive (`?dia=`): always practice. */
  day?: string;
}) {
  const { today } = useToday();
  const { trainer } = useTrainer();
  const progress = useRocketProgress();
  const { names: favorites } = useFavorites();
  const date = day ?? today;
  const puzzle = useMemo(
    () => (date ? calibrate(pool, relations, date) : undefined),
    [pool, relations, date],
  );
  const [chosen, setChosen] = useState<string[]>([]);
  const [practiceRequested, setPracticeRequested] = useState(false);
  const [practiceDay, setPracticeDay] = useState<RocketDay | null>(null);
  const [replay, setReplay] = useState<Replay | null>(null);
  const [outcome, setOutcome] = useState<RocketOutcome | null>(null);

  if (!date || !puzzle) {
    return (
      <div className="grid gap-4" aria-busy>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const official = date === today && !practiceRequested;
  const saved = progress.days.find((d) => d.date === date);
  const current: RocketDay = official
    ? (saved ?? { date, attempts: [] })
    : (practiceDay ?? { date, attempts: [] });
  const attempts = current.attempts;
  const closed = Boolean(current.result);
  const won = current.result === "won";
  const total = puzzle.opponent.length;
  const team = chosen.flatMap((name) => puzzle.hand.find((p) => p.name === name) ?? []);
  const used = teamBst(team);
  const repeated = attempts.some(
    (a) => a.order.length === chosen.length && a.order.every((name, i) => name === chosen[i]),
  );
  const ready = team.length === PICK && used <= CAP && !repeated && !closed;
  const itemName = outcome?.item as keyof typeof REWARD_ITEMS | undefined;
  const item = itemName ? items.find((i) => i.name === itemName) : undefined;

  function toggle(pokemon: BattlePokemon) {
    sfx("click");
    setChosen((list) =>
      list.includes(pokemon.name)
        ? list.filter((name) => name !== pokemon.name)
        : list.length < PICK
          ? [...list, pokemon.name]
          : list,
    );
  }

  function move(from: number, to: number) {
    setChosen((list) => {
      const copy = [...list];
      const [name] = copy.splice(from, 1);
      if (name !== undefined) copy.splice(to, 0, name);
      return copy;
    });
  }

  function attack() {
    if (!ready || !puzzle) return;
    const result = attemptBattle(puzzle, team, relations);
    const attempt = toAttempt(team, puzzle.opponent, result);
    if (official) {
      markDex({ used: team.map((p) => p.id), seen: puzzle.opponent.map((p) => p.id) });
      setOutcome(recordRocketAttempt(date, attempt).outcome);
    } else {
      const base = { days: practiceDay ? [practiceDay] : [] };
      setPracticeDay(addAttempt(base, date, attempt).days.find((d) => d.date === date) ?? null);
    }
    window.scrollTo({ top: 0 });
    setReplay({ result, team, number: attempts.length + 1 });
  }

  if (replay) {
    return (
      <BattleView
        key={replay.number}
        result={replay.result}
        team={replay.team}
        opponent={puzzle.opponent}
        trainer={r.trainer}
        playerName={trainer?.name ?? m.trainer.anonymous}
        heading={`${r.title} · ${r.attempt(replay.number, MAX_ATTEMPTS)}`}
        trainerImage="/img/jessie.png"
        doneLabel={r.back}
        badge={replay.result.winner === "player"}
        onDone={() => {
          setReplay(null);
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  return (
    <div className="grid gap-5" data-testid="rocket-ambush">
      <header className="flex items-center gap-3">
        <RocketDuo className="w-20 shrink-0 [&_img]:!h-16 [&_img:last-child]:!h-20" />
        <div className="grid gap-1">
          <h1 className="text-xs leading-relaxed sm:text-sm">{r.title}</h1>
          <p className="text-muted text-sm">
            {official
              ? r.day(formatDailyDate(date))
              : `${m.practiceBadge} · ${r.day(formatDailyDate(date))}`}
          </p>
        </div>
      </header>

      {!official && (
        <p className="border-border rounded-2xl border-2 border-dashed p-2 text-sm" role="status">
          {r.practiceLabel}
        </p>
      )}

      {closed && (
        <Card className="grid gap-2" data-testid="rocket-result">
          <h2 className="flex items-center gap-2 text-xs leading-relaxed">
            {won && <Trophy aria-hidden className="size-5 text-amber-500" />}
            {won ? r.wonTitle : r.lostTitle}
          </h2>
          <p className="text-base">{won ? r.wonIn(attempts.length) : r.lostText}</p>
          {official && outcome?.ball && (
            <p className="font-display flex items-center gap-2 text-[0.6rem] leading-relaxed">
              <BallIcon ball={outcome.ball} className="size-8" />
              {m.ballWon(m.balls[outcome.ball])}
            </p>
          )}
          {official && item && itemName && (
            <p className="font-display flex items-center gap-2 text-[0.6rem] leading-relaxed">
              <ItemIcon item={item} className="size-8" />
              {m.itemWon(REWARD_ITEMS[itemName])}
            </p>
          )}
          {official &&
            outcome?.unlocked.map((id) => (
              <p key={id} className="flex items-center gap-2 text-sm">
                <Trophy aria-hidden className="size-4 text-amber-500" />
                <strong>{m.achievements[id].label}</strong>: {m.achievements[id].description}
              </p>
            ))}
        </Card>
      )}
      {official && outcome?.streakBonus && (
        <p
          className="font-display flex items-center gap-2 text-[0.6rem] leading-relaxed"
          role="status"
        >
          <BallIcon ball="master" className="size-8" />
          {m.streakBonus(outcome.streakBonus)}
        </p>
      )}

      <Tip id="ambush" />

      <section aria-labelledby="rocket-opponent" className="grid gap-2">
        <h2 id="rocket-opponent" className="flex items-center text-[0.65rem]">
          {r.opponentTitle}
          <InfoTip label={m.tipTitles.difficulty} testId="rocket-difficulty">
            {r.difficulty(Math.round(puzzle.winRate * 100))}
          </InfoTip>
        </h2>
        <ol className="grid grid-cols-4 gap-1 sm:gap-2">
          {puzzle.opponent.map((pokemon, i) => (
            <li key={pokemon.name} className="relative" data-testid="rocket-opponent">
              <span className="font-display bg-foreground text-background absolute top-1 left-1 z-10 rounded-md px-1.5 py-0.5 text-[0.55rem]">
                {i + 1}
              </span>
              <GymPokemon pokemon={pokemon} compact showTypes className="h-full px-1" />
            </li>
          ))}
        </ol>
      </section>

      <AttemptList attempts={attempts} total={total} />

      {!closed && (
        <>
          <section aria-labelledby="rocket-team" className="grid gap-2">
            <h2 id="rocket-team" className="text-[0.65rem]">
              {r.teamTitle}
            </h2>
            <ol className="grid gap-2">
              {Array.from({ length: PICK }, (_, i) => {
                const member = team[i];
                return (
                  <li
                    key={member?.name ?? `slot-${i}`}
                    className={cn(
                      "border-border flex min-h-14 items-center gap-2 rounded-2xl border-2 p-2",
                      member ? "bg-surface" : "text-muted border-dashed",
                    )}
                    data-testid="rocket-slot"
                  >
                    <span className="font-display w-4 text-center text-xs">{i + 1}</span>
                    {member ? (
                      <>
                        <span className="font-display flex-1 text-[0.6rem] leading-relaxed">
                          {formatName(member.name)}
                          {i === 0 && (
                            <span className="text-muted block font-sans text-xs">
                              {m.opponentLead}
                            </span>
                          )}
                        </span>
                        <Button
                          variant="ghost"
                          disabled={i === 0}
                          onClick={() => move(i, i - 1)}
                          aria-label={m.moveUp(formatName(member.name))}
                        >
                          <ArrowUp aria-hidden className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={i === team.length - 1}
                          onClick={() => move(i, i + 1)}
                          aria-label={m.moveDown(formatName(member.name))}
                        >
                          <ArrowDown aria-hidden className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => toggle(member)}
                          aria-label={r.unselect(formatName(member.name))}
                        >
                          <X aria-hidden className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <span className="text-sm">{r.emptySlot(i + 1)}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-labelledby="rocket-hand" className="grid gap-2">
            <h2 id="rocket-hand" className="flex items-center text-[0.65rem]">
              {r.handTitle}
              <InfoTip label={m.tipTitles.hand}>{r.handHint(CAP)}</InfoTip>
            </h2>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {puzzle.hand.map((pokemon) => {
                const selected = chosen.includes(pokemon.name);
                const fits = selected || (team.length < PICK && used + pokemon.bst <= CAP);
                return (
                  <li key={pokemon.name}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      disabled={!fits}
                      onClick={() => toggle(pokemon)}
                      aria-label={
                        selected
                          ? r.unselect(formatName(pokemon.name))
                          : r.select(formatName(pokemon.name))
                      }
                      className={cn(
                        "relative block h-full w-full rounded-2xl text-left transition-all",
                        selected && "ring-primary-600 ring-4",
                        !fits && "opacity-50 grayscale",
                      )}
                    >
                      <GymPokemon pokemon={pokemon} showStats className="h-full">
                        {favorites.includes(pokemon.name) && (
                          <span
                            className="text-primary-600 text-xs font-bold"
                            data-testid="favorite-tag"
                          >
                            {m.favoriteTag}
                          </span>
                        )}
                        {selected ? (
                          <span className="bg-primary-600 text-on-primary mt-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold">
                            <Check aria-hidden className="size-3" />
                            {chosen.indexOf(pokemon.name) + 1}
                          </span>
                        ) : (
                          !fits &&
                          team.length < PICK && (
                            <span className="mt-2 text-xs font-bold">{r.noFit}</span>
                          )
                        )}
                      </GymPokemon>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <ActionBar
        hint={
          closed ? undefined : (
            <p className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="tabular-nums" data-testid="rocket-strength">
                {r.strength(used, CAP)}
              </span>
              {repeated && <span className="font-bold">{r.repeated}</span>}
            </p>
          )
        }
      >
        {closed ? (
          <>
            {official && (
              <ShareButton
                title={r.shareTitle}
                text={(origin) => rocketShareText(current, origin, r.shareTitle)}
              />
            )}
            {official ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setPracticeRequested(true);
                  setChosen([]);
                }}
              >
                <Dumbbell aria-hidden className="size-4" />
                {r.practice}
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  setPracticeDay(null);
                  setChosen([]);
                }}
              >
                <Dumbbell aria-hidden className="size-4" />
                {r.practice}
              </Button>
            )}
            <LinkButton href="/gym">{r.backToGym}</LinkButton>
          </>
        ) : (
          <Button disabled={!ready} onClick={attack}>
            <Swords aria-hidden className="size-4" />
            {r.go(attempts.length + 1, MAX_ATTEMPTS)}
          </Button>
        )}
      </ActionBar>
    </div>
  );
}
