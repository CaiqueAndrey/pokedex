import { BATTLE_LEVEL, CRITICAL_CHANCE, CRITICAL_MULTIPLIER, MOVE_POWER, STAB } from "@/config/gym";
import type { BattlePokemon } from "@/types/battle";
import type { PokemonTypeName, StatName, TypeRelations } from "@/types/pokemon";
import { computeMatchups } from "../type-effectiveness";
import type { Rng } from "./rng";

/** Stats at level 50 with perfect IVs (31) and no EVs, like a fair in-game battle. */
export function levelStats(base: Record<StatName, number>, level = BATTLE_LEVEL) {
  const scaled = (value: number) => Math.floor(((2 * value + 31) * level) / 100);
  return {
    hp: scaled(base.hp) + level + 10,
    attack: scaled(base.attack) + 5,
    defense: scaled(base.defense) + 5,
    specialAttack: scaled(base["special-attack"]) + 5,
    specialDefense: scaled(base["special-defense"]) + 5,
    speed: scaled(base.speed) + 5,
  };
}

export type LevelStats = ReturnType<typeof levelStats>;

export interface AttackChoice {
  type: PokemonTypeName;
  effectiveness: number;
  physical: boolean;
}

/** No move lists: a Pokémon attacks with whichever of its own types hits hardest (STAB). */
export function bestAttack(
  attacker: BattlePokemon,
  defender: BattlePokemon,
  relations: TypeRelations,
): AttackChoice {
  const matchups = computeMatchups(defender.types, relations);
  const physical = attacker.stats.attack >= attacker.stats["special-attack"];
  const [first, ...rest] = attacker.types;
  let best: AttackChoice = { type: first, effectiveness: matchups[first], physical };
  for (const type of rest) {
    if (matchups[type] > best.effectiveness)
      best = { type, effectiveness: matchups[type], physical };
  }
  return best;
}

export interface DamageRoll {
  damage: number;
  type: PokemonTypeName;
  effectiveness: number;
  critical: boolean;
  /** No type can hurt the defender: falls back to a 1-damage Struggle so battles always end. */
  struggle: boolean;
}

/** Simplified game formula: ((22·Power·A/D)/50 + 2) × STAB × type × critical × random(0.85–1). */
export function rollDamage(
  attacker: BattlePokemon,
  defender: BattlePokemon,
  relations: TypeRelations,
  rng: Rng,
  stats: { attacker: LevelStats; defender: LevelStats } = {
    attacker: levelStats(attacker.stats),
    defender: levelStats(defender.stats),
  },
): DamageRoll {
  const choice = bestAttack(attacker, defender, relations);
  const critical = rng() < CRITICAL_CHANCE;
  const random = 0.85 + rng() * 0.15;
  if (choice.effectiveness === 0) {
    return { damage: 1, type: choice.type, effectiveness: 0, critical: false, struggle: true };
  }
  const attack = choice.physical ? stats.attacker.attack : stats.attacker.specialAttack;
  const defense = choice.physical ? stats.defender.defense : stats.defender.specialDefense;
  const base =
    Math.floor(Math.floor((((2 * BATTLE_LEVEL) / 5 + 2) * MOVE_POWER * attack) / defense) / 50) + 2;
  const damage = Math.max(
    1,
    Math.floor(base * STAB * choice.effectiveness * (critical ? CRITICAL_MULTIPLIER : 1) * random),
  );
  return {
    damage,
    type: choice.type,
    effectiveness: choice.effectiveness,
    critical,
    struggle: false,
  };
}

/** How good `candidate` is against `opponent`: offense minus what it takes back. */
export function matchupScore(
  candidate: BattlePokemon,
  opponent: BattlePokemon,
  relations: TypeRelations,
): number {
  return (
    bestAttack(candidate, opponent, relations).effectiveness -
    bestAttack(opponent, candidate, relations).effectiveness
  );
}
