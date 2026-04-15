/**
 * Bingo draw sound: optional `NEXT_PUBLIC_DRAW_CHIME_URL` (MP3/WAV/OGG), else Web Audio synth.
 * Call resumeAudioContext() from a user gesture before playing (mobile unlock).
 */

let sharedCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx || sharedCtx.state === "closed") sharedCtx = new Ctx();
  return sharedCtx;
}

/** Call from a click/tap handler to unlock audio on iOS/Chrome. */
export async function resumeAudioContext(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") await ctx.resume();
}

// ─── Internal helpers ─────────────────────────────────────────────────────────
function tone(
  ctx: AudioContext,
  type: OscillatorType,
  freq: number,
  startOffset: number,
  duration: number,
  peakGain = 0.18,
  destination: AudioNode = ctx.destination
) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  const now  = ctx.currentTime;

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now + startOffset);

  gain.gain.setValueAtTime(0.0001, now + startOffset);
  gain.gain.exponentialRampToValueAtTime(peakGain, now + startOffset + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(now + startOffset);
  osc.stop(now + startOffset + duration + 0.02);
}

// ─── Ball draw chime ──────────────────────────────────────────────────────────
const CUSTOM_URL =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_DRAW_CHIME_URL?.trim()
    : undefined;

/** If `NEXT_PUBLIC_DRAW_CHIME_URL` is set, plays that MP3/OGG/WAV (public HTTPS URL). */
export function playDrawChime(): void {
  if (CUSTOM_URL && typeof window !== "undefined") {
    try {
      const a = new Audio(CUSTOM_URL);
      a.volume = 0.9;
      void a.play().catch(() => playDrawChimeSynth());
      return;
    } catch {
      playDrawChimeSynth();
      return;
    }
  }
  playDrawChimeSynth();
}

function playDrawChimeSynth(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Add a touch of reverb-like depth with a convolver (simple delay mix)
  const master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);

  // Three ascending tones: C5 → E5 → G5
  tone(ctx, "sine",     523.25, 0.00, 0.40, 0.20, master);
  tone(ctx, "sine",     659.25, 0.13, 0.40, 0.20, master);
  tone(ctx, "sine",     783.99, 0.26, 0.55, 0.24, master);
  // Add a high shimmer on the last note
  tone(ctx, "triangle", 1568,   0.26, 0.30, 0.06, master);
}

// ─── Game-over fanfare ────────────────────────────────────────────────────────
/** Triumphant fanfare — plays when all balls are drawn. */
export function playGameOverFanfare(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const master = ctx.createGain();
  master.gain.value = 0.85;
  master.connect(ctx.destination);

  // Rising melody: C E G C(oct) — classic "winner" fanfare
  const notes = [
    { freq: 523.25, t: 0.00, dur: 0.25 },  // C5
    { freq: 659.25, t: 0.18, dur: 0.25 },  // E5
    { freq: 783.99, t: 0.36, dur: 0.25 },  // G5
    { freq: 1046.5, t: 0.54, dur: 0.60 },  // C6
    // Second flourish
    { freq: 783.99, t: 0.80, dur: 0.18 },
    { freq: 880.00, t: 0.95, dur: 0.18 },
    { freq: 1046.5, t: 1.10, dur: 0.80 },
  ];
  notes.forEach(({ freq, t, dur }) =>
    tone(ctx, "sine", freq, t, dur, 0.22, master)
  );

  // Harmony layer (lower octave, softer)
  const harmony = [
    { freq: 261.63, t: 0.00, dur: 0.60 },  // C4
    { freq: 329.63, t: 0.18, dur: 0.60 },  // E4
    { freq: 392.00, t: 0.36, dur: 0.60 },  // G4
    { freq: 523.25, t: 0.54, dur: 1.20 },  // C5
  ];
  harmony.forEach(({ freq, t, dur }) =>
    tone(ctx, "triangle", freq, t, dur, 0.08, master)
  );
}
