"use client";

import { RotateCcw, Swords } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GYMS } from "@/config/gym";
import { messages } from "@/config/messages";
import type { FriendlyLeader } from "@/lib/battle/friendly";
import { simulateBattle } from "@/lib/battle/simulate";
import type { BattlePokemon } from "@/types/battle";
import type { TypeRelations } from "@/types/pokemon";
import { BattleView } from "../gym/battle-view";
import { useTrainer } from "../gym/use-gym";

const f = messages.friendly;

interface Match {
  leader: FriendlyLeader;
  seed: string;
  team: BattlePokemon[];
  opponent: BattlePokemon[];
  choices: number[];
  over: boolean;
}

/**
 * "Meu time" against Brock or Misty: the gym's rules and field, your replacement picks, no
 * rewards. The server builds both teams; the battle runs here, like in the gym.
 */
export function FriendlyBattle({
  names,
  relations,
}: {
  names: string[];
  relations: TypeRelations;
}) {
  const { trainer } = useTrainer();
  const [match, setMatch] = useState<Match | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function start(leader: FriendlyLeader) {
    setStatus("loading");
    try {
      const response = await fetch(
        `/api/friendly?leader=${leader}&team=${encodeURIComponent(names.join(","))}`,
      );
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as Pick<Match, "seed" | "team" | "opponent">;
      setMatch({ leader, ...data, choices: [], over: false });
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  if (match) {
    const gym = GYMS[match.leader];
    const result = simulateBattle(match.team, match.opponent, relations, match.seed, {
      ...(gym.field ? { field: gym.field } : {}),
      choices: match.choices,
    });
    return (
      <section aria-label={f.title} className="grid gap-3" data-testid="friendly">
        <BattleView
          key={match.seed}
          result={result}
          team={match.team}
          opponent={match.opponent}
          trainer={gym.leader}
          playerName={trainer?.name ?? messages.gym.trainer.anonymous}
          heading={f.heading(gym.name)}
          trainerImage={gym.leaderImage}
          doneLabel={f.close}
          doneHint={result.winner === "player" ? f.won : f.lost}
          relations={relations}
          choicesMade={match.choices.length}
          onChoose={(index) => setMatch({ ...match, choices: [...match.choices, index] })}
          onEnd={() => setMatch((current) => (current ? { ...current, over: true } : current))}
          onDone={() => setMatch(null)}
        />
        {match.over && (
          <Button variant="secondary" className="w-fit" onClick={() => start(match.leader)}>
            <RotateCcw aria-hidden className="size-4" />
            {f.again}
          </Button>
        )}
      </section>
    );
  }

  return (
    <Card className="grid gap-3" data-testid="friendly">
      <h2 className="text-xs">{f.title}</h2>
      <p className="text-muted text-sm">{f.description}</p>
      {names.length === 0 ? (
        <p className="text-sm">{f.needTeam}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(["easy", "hard"] as const).map((leader) => (
            <Button
              key={leader}
              disabled={status === "loading"}
              onClick={() => start(leader)}
              variant={leader === "easy" ? "primary" : "secondary"}
            >
              <Swords aria-hidden className="size-4" />
              {f.against(GYMS[leader].leader)}
            </Button>
          ))}
        </div>
      )}
      <p className="text-sm" role="status">
        {status === "loading" ? f.loading : status === "error" ? f.error : ""}
      </p>
    </Card>
  );
}
