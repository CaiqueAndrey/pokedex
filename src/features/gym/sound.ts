"use client";

import { TUNES, type Note, type TuneName } from "@/lib/sound/tunes";

/** Master volume: 8-bit square waves are loud, so everything plays well below full scale. */
const MASTER = 0.12;

let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;

/**
 * Browsers only allow audio after a user gesture, so the context is created lazily by the first
 * sound, which always follows a click. Returns null where Web Audio is missing (old browsers, tests).
 */
function audio(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume();
  return context;
}

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noise) return noise;
  noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

function schedule(ctx: AudioContext, note: Note, start: number) {
  if (note.volume === 0 || (note.freq === 0 && note.wave !== "noise")) return;
  const gain = ctx.createGain();
  const peak = MASTER * (note.volume ?? 0.6);
  // A tiny attack and release avoid clicks; the note decays like a chip channel.
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + note.duration);
  gain.connect(ctx.destination);

  let source: AudioScheduledSourceNode;
  if (note.wave === "noise") {
    const buffer = ctx.createBufferSource();
    buffer.buffer = noiseBuffer(ctx);
    source = buffer;
  } else {
    const osc = ctx.createOscillator();
    osc.type = note.wave;
    osc.frequency.setValueAtTime(note.freq, start);
    if (note.slideTo)
      osc.frequency.exponentialRampToValueAtTime(note.slideTo, start + note.duration);
    source = osc;
  }
  source.connect(gain);
  source.start(start);
  source.stop(start + note.duration + 0.02);
}

export function playTune(name: TuneName) {
  const ctx = audio();
  if (!ctx) return;
  let time = ctx.currentTime + 0.01;
  for (const note of TUNES[name]) {
    schedule(ctx, note, time);
    time += note.duration;
  }
}

/** Short haptic feedback on phones that support it (ignored elsewhere). */
export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}
