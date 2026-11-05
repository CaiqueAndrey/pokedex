import type { BattleEvent } from "@/types/battle";

/**
 * 8-bit sound effects as plain data: sequences of notes for a Web Audio player to synthesize.
 * Every melody here is original (short arpeggios and scales), not taken from any game soundtrack.
 * Kept framework- and browser-free so it can be tested.
 */

export type Wave = "square" | "triangle" | "sawtooth" | "noise";

export interface Note {
  /** Frequency in Hz; 0 is a rest. Ignored for noise. */
  freq: number;
  /** Seconds. */
  duration: number;
  wave: Wave;
  /** 0–1, relative to the master volume. */
  volume?: number;
  /** Glide to this frequency over the note (pitch sweeps for hits and faints). */
  slideTo?: number;
}

const NOTE_INDEX: Record<string, number> = {
  C: -9,
  "C#": -8,
  D: -7,
  "D#": -6,
  E: -5,
  F: -4,
  "F#": -3,
  G: -2,
  "G#": -1,
  A: 0,
  "A#": 1,
  B: 2,
};

/** "A4" → 440 Hz (equal temperament). */
export function frequency(note: string): number {
  const match = /^([A-G]#?)(\d)$/.exec(note);
  const index = match?.[1] === undefined ? undefined : NOTE_INDEX[match[1]];
  if (!match || index === undefined) throw new Error(`Bad note: ${note}`);
  const semitones = index + (Number(match[2]) - 4) * 12;
  return Math.round(440 * 2 ** (semitones / 12) * 100) / 100;
}

const n = (note: string, duration: number, wave: Wave = "square", volume = 0.6): Note => ({
  freq: frequency(note),
  duration,
  wave,
  volume,
});
const rest = (duration: number): Note => ({ freq: 0, duration, wave: "square", volume: 0 });

export const TUNES = {
  click: [n("A5", 0.04, "square", 0.3)],
  roll: ["C5", "E5", "G5", "C6", "E5", "G5", "C6", "E6"].map((note) =>
    n(note, 0.035, "square", 0.3),
  ),
  pick: [n("E5", 0.06), n("A5", 0.06), n("E6", 0.1)],
  send: [n("G4", 0.05, "triangle"), n("D5", 0.05, "triangle"), n("G5", 0.09, "triangle")],
  hit: [{ freq: 0, duration: 0.09, wave: "noise", volume: 0.5 }],
  superHit: [
    { freq: 0, duration: 0.06, wave: "noise", volume: 0.7 },
    { freq: 880, duration: 0.12, wave: "square", volume: 0.5, slideTo: 1320 },
  ],
  weakHit: [{ freq: 0, duration: 0.05, wave: "noise", volume: 0.25 }],
  critical: [{ freq: 0, duration: 0.05, wave: "noise", volume: 0.7 }, n("E6", 0.05), n("B6", 0.08)],
  faint: [{ freq: 660, duration: 0.45, wave: "square", volume: 0.5, slideTo: 110 }],
  battleWon: [
    n("C5", 0.1),
    n("E5", 0.1),
    n("G5", 0.1),
    n("C6", 0.25),
    rest(0.05),
    n("G5", 0.1),
    n("C6", 0.35),
  ],
  battleLost: [
    n("G4", 0.18, "triangle"),
    n("F#4", 0.18, "triangle"),
    n("F4", 0.18, "triangle"),
    n("E4", 0.5, "triangle"),
  ],
  badge: [
    n("G4", 0.12),
    n("C5", 0.12),
    n("E5", 0.12),
    n("G5", 0.24),
    n("E5", 0.12),
    n("G5", 0.4),
    rest(0.06),
    n("A5", 0.12),
    n("B5", 0.12),
    n("C6", 0.5),
  ],
  reveal: [n("C5", 0.08), n("G5", 0.08), n("E6", 0.08), rest(0.04), n("C6", 0.3)],
  wrong: [n("E4", 0.08, "triangle"), n("C4", 0.16, "triangle")],
} satisfies Record<string, Note[]>;

export type TuneName = keyof typeof TUNES;

export const tuneDuration = (tune: readonly Note[]) =>
  tune.reduce((sum, note) => sum + note.duration, 0);

/** Which effect a battle event plays (the end jingle is chosen by the caller, it depends on the run). */
export function battleEventTune(event: BattleEvent): TuneName | undefined {
  switch (event.kind) {
    case "send":
      return "send";
    case "faint":
      return "faint";
    case "attack":
      if (event.critical) return "critical";
      if (event.effectiveness > 1) return "superHit";
      return event.effectiveness < 1 ? "weakHit" : "hit";
    case "end":
      return undefined;
  }
}
