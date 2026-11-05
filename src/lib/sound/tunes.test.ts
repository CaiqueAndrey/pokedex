import { describe, expect, it } from "vitest";
import type { BattleEvent } from "@/types/battle";
import { TUNES, battleEventTune, frequency, tuneDuration } from "./tunes";

describe("8-bit tunes", () => {
  it("tunes notes in equal temperament", () => {
    expect(frequency("A4")).toBe(440);
    expect(frequency("A5")).toBe(880);
    expect(frequency("C4")).toBeCloseTo(261.63, 1);
    expect(() => frequency("H2")).toThrow();
  });

  it("keeps effects short and audible", () => {
    for (const [name, tune] of Object.entries(TUNES)) {
      expect(tune.length, name).toBeGreaterThan(0);
      // Effects never hold the battle back; jingles stay under two seconds.
      expect(tuneDuration(tune), name).toBeLessThan(2);
      for (const note of tune) {
        expect(note.duration).toBeGreaterThan(0);
        expect(note.volume ?? 0.6).toBeLessThanOrEqual(1);
        if (note.wave !== "noise" && note.freq > 0) {
          expect(note.freq).toBeGreaterThanOrEqual(50);
          expect(note.freq).toBeLessThanOrEqual(4000);
        }
      }
    }
  });

  it("maps battle events to effects", () => {
    const attack = (effectiveness: number, critical = false): BattleEvent => ({
      kind: "attack",
      side: "player",
      attacker: 0,
      defender: 0,
      type: "fire",
      damage: 10,
      effectiveness,
      critical,
      struggle: false,
      hpLeft: 5,
    });
    expect(battleEventTune(attack(2))).toBe("superHit");
    expect(battleEventTune(attack(0.5))).toBe("weakHit");
    expect(battleEventTune(attack(1))).toBe("hit");
    expect(battleEventTune(attack(2, true))).toBe("critical");
    expect(battleEventTune({ kind: "send", side: "player", index: 0 })).toBe("send");
    expect(battleEventTune({ kind: "faint", side: "player", index: 0 })).toBe("faint");
    expect(battleEventTune({ kind: "end", winner: "player" })).toBeUndefined();
  });
});
