import { useCallback, useState } from 'react';

// A small, self-contained sound manager for lightweight UI/immersion
// sound effects.
//
// Every effect below is SYNTHESIZED on the fly with the Web Audio API
// instead of shipping .mp3/.wav asset files. That's deliberate:
//   - "must preload / no noticeable delay" is trivially satisfied — there
//     is nothing to fetch or decode, so the very first play() call has the
//     same near-zero latency as the hundredth.
//   - it keeps the game "lightweight" (zero extra KB of audio assets,
//     no asset pipeline / public/ folder needed).
// If real audio files are ever wanted instead, only the EFFECTS table
// below needs to change — every call site in the app just calls
// playSound('someName') and doesn't care how the sound is produced.
//
// This module owns exactly one piece of persisted state: whether sound is
// on. It's a PERSONAL, per-device preference — not a room-wide game
// setting — so it deliberately does NOT go through settings.js/socket
// (updateSettings is host-controlled and server-synced to the whole room;
// this is neither). It's stored in localStorage using the same
// key-namespacing and try/catch-guarded pattern session.js already uses
// elsewhere in this app.

const SOUND_PREF_KEY = 'peekoops:soundEnabled';

export function isSoundEnabled() {
  try {
    const raw = localStorage.getItem(SOUND_PREF_KEY);
    return raw === null ? true : raw === '1'; // default ON
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(SOUND_PREF_KEY, enabled ? '1' : '0');
  } catch {
    /* localStorage unavailable — the preference just won't persist */
  }
}

// A tiny React hook so exactly one UI control (the sound toggle button in
// App.jsx) can read/flip the preference. This is NOT a new state
// management system — it's a thin useState wrapper around the plain
// functions above, the same shape as any other local component state,
// just persisted. No context/provider/store is introduced.
export function useSoundPreference() {
  const [enabled, setEnabledState] = useState(isSoundEnabled);
  const setEnabled = useCallback((next) => {
    setEnabledState(next);
    setSoundEnabled(next);
  }, []);
  return [enabled, setEnabled];
}

// ---- synthesis --------------------------------------------------------

let audioCtx = null;
function getContext() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null; // Web Audio unavailable — sounds just won't play
  if (!audioCtx) audioCtx = new Ctx();
  // Browsers start a freshly-created AudioContext in 'suspended' state
  // until a user gesture. Every playSound() call in this app happens
  // either directly inside a click handler or shortly after one (a socket
  // event that followed a click), so resuming here is safe and costs
  // nothing on the calls that don't need it.
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

// One short synthesized note.
function tone(ctx, { freq, start, duration, type = 'sine', peakGain = 0.16 }) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peakGain, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

// Each entry is a tiny, self-contained "song" (a few tone() calls placed
// relative to a start time), so every effect is easy to read and tune in
// isolation.
const EFFECTS = {
  doneDrawing: (ctx, t0) => {
    tone(ctx, { freq: 880, start: t0, duration: 0.12, type: 'triangle' });
    tone(ctx, { freq: 1175, start: t0 + 0.09, duration: 0.14, type: 'triangle' });
  },
  reveal: (ctx, t0) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t0);
    osc.frequency.exponentialRampToValueAtTime(880, t0 + 0.22);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.15, t0 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.3);
  },
  vote: (ctx, t0) => {
    tone(ctx, { freq: 660, start: t0, duration: 0.09, type: 'square', peakGain: 0.1 });
  },
  crewWin: (ctx, t0) => {
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      tone(ctx, { freq, start: t0 + i * 0.11, duration: 0.22, type: 'triangle' });
    });
  },
  impostorWin: (ctx, t0) => {
    tone(ctx, { freq: 392, start: t0, duration: 0.28, type: 'sawtooth', peakGain: 0.13 });
    tone(ctx, { freq: 311.13, start: t0 + 0.2, duration: 0.4, type: 'sawtooth', peakGain: 0.13 });
  },
  countdown: (ctx, t0) => {
    tone(ctx, { freq: 1046.5, start: t0, duration: 0.08, type: 'square', peakGain: 0.12 });
  },
};

// Minimum gap between two plays of the SAME effect. This is a safety net,
// not the primary de-dupe mechanism — every call site in App.jsx/Timer.jsx
// already only invokes each sound from one specific, single-fire trigger —
// but it makes the manager itself robust against any accidental
// double-call (e.g. a resync race, or a fast double-click) instead of
// relying purely on caller discipline. It also guarantees "no overlapping
// sounds" for the SAME cue: a repeat within the window is dropped rather
// than layered on top of the one still ringing out.
const MIN_REPEAT_GAP_MS = 250;
const lastPlayedAt = new Map();

export function playSound(name) {
  if (!isSoundEnabled()) return;
  const effect = EFFECTS[name];
  if (!effect) return;

  const now = Date.now();
  const last = lastPlayedAt.get(name) || 0;
  if (now - last < MIN_REPEAT_GAP_MS) return; // duplicate-playback guard
  lastPlayedAt.set(name, now);

  const ctx = getContext();
  if (!ctx) return;
  try {
    effect(ctx, ctx.currentTime);
  } catch {
    // A sound glitch must never affect gameplay.
  }
}
