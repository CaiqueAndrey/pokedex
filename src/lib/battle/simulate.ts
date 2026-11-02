import { MAX_ATTACKS } from "@/config/gym";
import type { BattleEvent, BattlePokemon, BattleResult, Side } from "@/types/battle";
import type { TypeRelations } from "@/types/pokemon";
import { levelStats, matchupScore, rollDamage, type LevelStats } from "./damage";
import { mulberry32, hashString, type Rng } from "./rng";

interface Fighter {
  pokemon: BattlePokemon;
  stats: LevelStats;
  hp: number;
}

const other = (side: Side): Side => (side === "player" ? "opponent" : "player");

/** The reserve with the best matchup against the opponent currently on the field. */
export function chooseReplacement(
  team: Fighter[],
  opponent: BattlePokemon,
  relations: TypeRelations,
): number {
  let bestIndex = -1;
  let bestScore = Number.NEGATIVE_INFINITY;
  team.forEach((fighter, index) => {
    if (fighter.hp <= 0) return;
    const score = matchupScore(fighter.pokemon, opponent, relations);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}

/**
 * One-on-one, in sequence: the leads fight, a fainted Pokémon is replaced by the reserve with the
 * best matchup, and the side with Pokémon left wins. Fully deterministic for a given seed.
 */
export function simulateBattle(
  player: BattlePokemon[],
  opponent: BattlePokemon[],
  relations: TypeRelations,
  seed: string | number,
): BattleResult {
  const rng: Rng = mulberry32(typeof seed === "number" ? seed : hashString(seed));
  const toFighters = (team: BattlePokemon[]): Fighter[] =>
    team.map((pokemon) => {
      const stats = levelStats(pokemon.stats);
      return { pokemon, stats, hp: stats.hp };
    });
  const teams: Record<Side, Fighter[]> = {
    player: toFighters(player),
    opponent: toFighters(opponent),
  };
  const active: Record<Side, number> = { player: 0, opponent: 0 };
  const events: BattleEvent[] = [
    { kind: "send", side: "player", index: 0 },
    { kind: "send", side: "opponent", index: 0 },
  ];
  const fighter = (side: Side) => teams[side][active[side]] as Fighter;

  let winner: Side | undefined;
  for (let attacks = 0; !winner && attacks < MAX_ATTACKS;) {
    const a = fighter("player");
    const b = fighter("opponent");
    const playerFirst =
      a.stats.speed === b.stats.speed ? rng() < 0.5 : a.stats.speed > b.stats.speed;
    const order: Side[] = playerFirst ? ["player", "opponent"] : ["opponent", "player"];

    for (const side of order) {
      const attacker = fighter(side);
      const defenderSide = other(side);
      const defender = fighter(defenderSide);
      const roll = rollDamage(attacker.pokemon, defender.pokemon, relations, rng, {
        attacker: attacker.stats,
        defender: defender.stats,
      });
      defender.hp = Math.max(0, defender.hp - roll.damage);
      attacks++;
      events.push({
        kind: "attack",
        side,
        attacker: active[side],
        defender: active[defenderSide],
        type: roll.type,
        damage: roll.damage,
        effectiveness: roll.effectiveness,
        critical: roll.critical,
        struggle: roll.struggle,
        hpLeft: defender.hp,
      });
      if (defender.hp > 0) continue;

      events.push({ kind: "faint", side: defenderSide, index: active[defenderSide] });
      const next = chooseReplacement(teams[defenderSide], attacker.pokemon, relations);
      if (next < 0) {
        winner = side;
      } else {
        active[defenderSide] = next;
        events.push({ kind: "send", side: defenderSide, index: next });
      }
      // A fainted Pokémon doesn't get to attack this turn.
      break;
    }
  }

  // Safety net (never expected): the side with more total HP left wins.
  const remaining = (side: Side) => teams[side].reduce((sum, f) => sum + f.hp, 0);
  winner ??= remaining("player") >= remaining("opponent") ? "player" : "opponent";
  events.push({ kind: "end", winner });

  return {
    winner,
    events,
    maxHp: {
      player: teams.player.map((f) => f.stats.hp),
      opponent: teams.opponent.map((f) => f.stats.hp),
    },
  };
}
