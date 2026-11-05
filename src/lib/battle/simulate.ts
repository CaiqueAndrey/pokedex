import { MAX_ATTACKS, STRUGGLE_RECOIL } from "@/config/gym";
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
 *
 * `playerHp` (the gauntlet) starts the player's team hurt: Pokémon at 0 HP sit out, and the first
 * one still standing opens.
 */
export function simulateBattle(
  player: BattlePokemon[],
  opponent: BattlePokemon[],
  relations: TypeRelations,
  seed: string | number,
  { playerHp }: { playerHp?: readonly number[] } = {},
): BattleResult {
  const rng: Rng = mulberry32(typeof seed === "number" ? seed : hashString(seed));
  const toFighters = (team: BattlePokemon[], hp?: readonly number[]): Fighter[] =>
    team.map((pokemon, index) => {
      const stats = levelStats(pokemon.stats);
      const start = hp?.[index];
      return { pokemon, stats, hp: start === undefined ? stats.hp : Math.min(stats.hp, start) };
    });
  const teams: Record<Side, Fighter[]> = {
    player: toFighters(player, playerHp),
    opponent: toFighters(opponent),
  };
  const startHp: Record<Side, number[]> = {
    player: teams.player.map((f) => f.hp),
    opponent: teams.opponent.map((f) => f.hp),
  };
  const firstStanding = Math.max(
    0,
    teams.player.findIndex((f) => f.hp > 0),
  );
  const active: Record<Side, number> = { player: firstStanding, opponent: 0 };
  const events: BattleEvent[] = [
    { kind: "send", side: "player", index: firstStanding },
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
      const recoil = roll.struggle
        ? Math.min(attacker.hp, Math.max(1, Math.floor(attacker.stats.hp * STRUGGLE_RECOIL)))
        : 0;
      attacker.hp -= recoil;
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
        ...(recoil > 0 ? { recoil, attackerHpLeft: attacker.hp } : {}),
      });
      if (defender.hp > 0 && attacker.hp > 0) continue;

      // Faints resolve defender first, then the attacker (Struggle recoil).
      const knockOut = (fainted: Side, against: BattlePokemon) => {
        events.push({ kind: "faint", side: fainted, index: active[fainted] });
        const next = chooseReplacement(teams[fainted], against, relations);
        if (next < 0) {
          winner ??= other(fainted);
        } else {
          active[fainted] = next;
          events.push({ kind: "send", side: fainted, index: next });
        }
      };
      if (defender.hp <= 0) knockOut(defenderSide, attacker.pokemon);
      if (attacker.hp <= 0 && !winner) knockOut(side, fighter(defenderSide).pokemon);
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
    startHp,
    finalHp: {
      player: teams.player.map((f) => f.hp),
      opponent: teams.opponent.map((f) => f.hp),
    },
    maxHp: {
      player: teams.player.map((f) => f.stats.hp),
      opponent: teams.opponent.map((f) => f.stats.hp),
    },
  };
}
