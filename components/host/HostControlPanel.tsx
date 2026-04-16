"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  clearBoardAndNewGame,
  drawNextNumber,
  endHostSession,
  updateWinPattern,
} from "@/app/host/actions";
import { letterForNumber } from "@/lib/bingo";
import type { WinPattern } from "@/lib/bingo/winPattern";
import { WIN_PATTERN_OPTIONS } from "@/lib/bingo/winPattern";
import { playDrawChime, resumeAudioContext } from "@/lib/audio/drawChime";
import type { BallPreset } from "@/lib/bingo";

// ─── Types ────────────────────────────────────────────────────────────────────
type LastDraw = { number: number; letter: string | null; order: number } | null;
type AutoSpeed = 0 | 5000 | 10000 | 15000 | 30000;

const SPEED_OPTIONS: { label: string; value: AutoSpeed }[] = [
  { label: "5 s",  value: 5000  },
  { label: "10 s", value: 10000 },
  { label: "15 s", value: 15000 },
  { label: "30 s", value: 30000 },
];

const LETTER_COLOR: Record<string, string> = {
  B: "#60a5fa", I: "#f87171", N: "#e5e7eb", G: "#4ade80", O: "#fb923c",
};

// ─── Component ────────────────────────────────────────────────────────────────
export function HostControlPanel({
  initialPreset,
  initialWinPattern,
  initialLastDraw = null,
}: {
  initialPreset: BallPreset;
  initialWinPattern: WinPattern;
  initialLastDraw?: LastDraw;
}) {
  const router = useRouter();
  const [preset, setPreset]       = useState<BallPreset>(initialPreset);
  const [winPattern, setWinPattern] = useState<WinPattern>(initialWinPattern);
  const [error, setError]         = useState<string | null>(null);
  const [lastDraw, setLastDraw]   = useState<LastDraw>(initialLastDraw);
  const [ending, setEnding]       = useState(false);
  const [wakeOn, setWakeOn]       = useState(false);
  const [pending, startTransition] = useTransition();

  // ── Auto-draw ──────────────────────────────────────────────────────────────
  const [autoSpeed, setAutoSpeed]   = useState<AutoSpeed>(0);
  const [countdown, setCountdown]   = useState(0);   // 0–100 (bar fill %)
  const autoRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const drawBusy = useRef(false);
  const autoSpeedRef = useRef<AutoSpeed>(0);

  useEffect(() => { autoSpeedRef.current = autoSpeed; }, [autoSpeed]);

  // ── Wake lock (must not release in an effect that re-runs when wakeOn toggles) ─
  const wakeRef = useRef<WakeLockSentinel | null>(null);
  const wakeOnRef = useRef(false);
  const [wakeMsg, setWakeMsg] = useState<string | null>(null);
  const [wakeAckAt, setWakeAckAt] = useState<number | null>(null);

  useEffect(() => {
    wakeOnRef.current = wakeOn;
  }, [wakeOn]);

  // Re-sync when returning from other host routes (Overview) so last draw isn’t stale
  useEffect(() => {
    setLastDraw(initialLastDraw);
  }, [initialLastDraw?.number, initialLastDraw?.order]);

  useEffect(() => {
    setWinPattern(initialWinPattern);
  }, [initialWinPattern]);

  async function requestWakeLock() {
    try {
      if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
        setWakeMsg("Screen wake lock is not supported in this browser (try Safari/Chrome).");
        return;
      }
      wakeRef.current = await navigator.wakeLock.request("screen");
      setWakeOn(true);
      setWakeMsg(null);
      setWakeAckAt(Date.now());
      window.setTimeout(() => setWakeAckAt(null), 3200);
      wakeRef.current.addEventListener("release", () => setWakeOn(false));
    } catch (e) {
      setWakeMsg(e instanceof Error ? e.message : "Could not enable keep-awake.");
    }
  }

  async function releaseWakeLock() {
    try {
      await wakeRef.current?.release();
    } catch {
      /* ignore */
    }
    wakeRef.current = null;
    setWakeOn(false);
  }

  useEffect(() => {
    async function onVisible() {
      if (document.visibilityState !== "visible" || !wakeOnRef.current) return;
      try {
        if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
        wakeRef.current = await navigator.wakeLock.request("screen");
        wakeRef.current.addEventListener("release", () => setWakeOn(false));
      } catch {
        /* tab may deny re-lock */
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    return () => {
      void wakeRef.current?.release().catch(() => {});
      wakeRef.current = null;
    };
  }, []);

  // ── Core draw ──────────────────────────────────────────────────────────────
  function executeDraw(calledFromAuto = false) {
    if (drawBusy.current) return;
    drawBusy.current = true;
    setError(null);

    startTransition(async () => {
      try {
        await resumeAudioContext();
        const res = await drawNextNumber();
        const letter = letterForNumber(preset, res.number);
        setLastDraw({ number: res.number, letter, order: res.draw_order });
        playDrawChime();
        router.refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Draw failed";
        setError(msg);
        // If all numbers drawn, stop auto-draw
        if (msg.includes("All numbers")) stopAuto();
      } finally {
        drawBusy.current = false;
        // Restart countdown after each auto draw
        if (calledFromAuto && autoSpeedRef.current > 0) restartCountdown(autoSpeedRef.current);
      }
    });
  }

  function onDraw() { executeDraw(false); }

  // ── Auto-draw ──────────────────────────────────────────────────────────────
  function stopAuto() {
    if (autoRef.current)  { clearInterval(autoRef.current);  autoRef.current  = null; }
    if (countRef.current) { clearInterval(countRef.current); countRef.current = null; }
    setAutoSpeed(0);
    setCountdown(0);
  }

  function restartCountdown(speed: number) {
    if (countRef.current) clearInterval(countRef.current);
    const startAt = Date.now();
    setCountdown(100);
    countRef.current = setInterval(() => {
      const elapsed = Date.now() - startAt;
      const pct = Math.max(0, 100 - (elapsed / speed) * 100);
      setCountdown(Math.round(pct));
      if (pct <= 0 && countRef.current) clearInterval(countRef.current);
    }, 80);
  }

  function startAuto(speed: AutoSpeed) {
    stopAuto();
    if (speed === 0) return;
    setAutoSpeed(speed);
    restartCountdown(speed);
    autoRef.current = setInterval(() => {
      executeDraw(true);
    }, speed);
  }

  function toggleAuto(speed: AutoSpeed) {
    if (autoSpeed === speed) {
      stopAuto();
    } else {
      startAuto(speed);
    }
  }

  // Cleanup on unmount
  useEffect(() => () => { stopAuto(); }, []); // eslint-disable-line

  // ── New game / clear ───────────────────────────────────────────────────────
  function onClear() {
    const ok = window.confirm(
      "Clear the board and start a new game? This ends the current game and starts a fresh one."
    );
    if (!ok) return;
    stopAuto();
    setError(null);
    startTransition(async () => {
      try {
        await clearBoardAndNewGame(preset, winPattern);
        setLastDraw(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not reset");
      }
    });
  }

  // ── End session ────────────────────────────────────────────────────────────
  async function onEndSession() {
    const ok = window.confirm(
      "End this session now? This closes the active game and returns you to Host."
    );
    if (!ok) return;
    stopAuto();
    setError(null);
    setEnding(true);
    try {
      await endHostSession();
      await releaseWakeLock();
      router.push("/host");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not end session");
    } finally {
      setEnding(false);
    }
  }

  const busy = pending || ending;

  return (
    <div className="space-y-5">

      {/* ── Last draw ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center rounded-xl border border-border bg-card/40 py-4 px-6 gap-4 min-h-[80px]">
        {lastDraw ? (
          <>
            <div
              className="flex h-16 w-16 flex-col items-center justify-center rounded-full border-2 font-black"
              style={{
                borderColor: LETTER_COLOR[lastDraw.letter ?? ""] ?? "#fff",
                boxShadow: `0 0 16px ${LETTER_COLOR[lastDraw.letter ?? ""] ?? "#fff"}44`,
                color: LETTER_COLOR[lastDraw.letter ?? ""] ?? "#fff",
              }}
            >
              {lastDraw.letter ? (
                <span className="text-xs leading-none">{lastDraw.letter}</span>
              ) : null}
              <span className="text-2xl leading-tight">{lastDraw.number}</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted">Last drawn</p>
              <p className="text-lg font-bold text-foreground">
                {lastDraw.letter ? `${lastDraw.letter}-` : ""}{lastDraw.number}
              </p>
              <p className="text-xs text-muted">Ball #{lastDraw.order}</p>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">No balls drawn yet — tap Draw to begin.</p>
        )}
      </div>

      {/* ── Win pattern (TV + room info) ────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card/40 p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          Win pattern
        </p>
        <p className="text-xs text-muted">
          What players need on their cards. Shown on the TV display.
        </p>
        <select
          value={winPattern}
          disabled={busy}
          onChange={(e) => {
            const next = e.target.value as WinPattern;
            setWinPattern(next);
            setError(null);
            startTransition(async () => {
              try {
                await updateWinPattern(next);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not update pattern");
              }
            });
          }}
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground"
        >
          {WIN_PATTERN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label} — {o.description}
            </option>
          ))}
        </select>
      </div>

      {/* ── Draw button ───────────────────────────────────────────────────── */}
      <button
        type="button"
        disabled={busy || autoSpeed > 0}
        onClick={onDraw}
        className="w-full rounded-xl border border-border bg-card py-7 text-xl font-bold text-foreground shadow-lg shadow-black/30 transition hover:border-accent/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending && !autoSpeed ? "Drawing…" : "🎱 Draw Next Ball"}
      </button>

      {/* ── Auto-draw ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Auto Draw</p>
          {autoSpeed > 0 ? (
            <button
              type="button"
              onClick={stopAuto}
              className="rounded-md border border-red-900/60 bg-red-950/30 px-3 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-950/50"
            >
              ⏹ Stop
            </button>
          ) : null}
        </div>

        {/* Speed chips */}
        <div className="flex flex-wrap gap-2">
          {SPEED_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              disabled={busy}
              onClick={() => toggleAuto(value)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                autoSpeed === value
                  ? "border-accent bg-accent/20 text-accent-foreground"
                  : "border-border bg-card/60 text-muted hover:border-accent/50 hover:text-foreground"
              } disabled:opacity-40`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Countdown bar */}
        {autoSpeed > 0 ? (
          <div className="space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent transition-none"
                style={{ width: `${countdown}%` }}
              />
            </div>
            <p className="text-center text-xs text-muted">
              Auto-drawing every {autoSpeed / 1000}s
              {pending ? " · Drawing…" : ""}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted">
            Select a speed above to draw automatically. You can still stop anytime.
          </p>
        )}
      </div>

      {/* ── Game controls ─────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={busy}
          onClick={onClear}
          className="rounded-xl border border-amber-900/60 bg-amber-950/20 py-4 text-sm font-semibold text-amber-200 transition hover:bg-amber-950/40 disabled:opacity-50"
        >
          🔄 New Game (same session)
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onEndSession}
          className="rounded-xl border border-red-900/60 bg-red-950/20 py-4 text-sm font-semibold text-red-200 transition hover:bg-red-950/40 disabled:opacity-50"
        >
          {ending ? "Ending…" : "⏏ End Session"}
        </button>
      </div>

      {/* ── Keep-awake + preset ───────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={busy}
          aria-pressed={wakeOn}
          onClick={() => {
            setError(null);
            setWakeMsg(null);
            wakeOn ? void releaseWakeLock() : void requestWakeLock();
          }}
          className={`rounded-xl border py-3 text-xs font-semibold transition active:scale-[0.97] disabled:opacity-40 ${
            wakeOn
              ? "border-green-500/70 bg-green-950/40 text-green-100 shadow-[0_0_0_2px_rgba(34,197,94,0.35)] ring-2 ring-green-500/30 hover:bg-green-950/55"
              : "border-border bg-card/50 text-muted hover:border-accent/40 hover:text-foreground"
          }`}
        >
          {wakeOn ? "🔆 Screen awake — ON" : "🔅 Keep screen awake"}
        </button>

        <div className="rounded-xl border border-border bg-card/30 px-4 py-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted">
            Next game preset
          </p>
          <div className="flex gap-4 text-sm text-foreground">
            {(["US-75", "UK-90"] as BallPreset[]).map((p) => (
              <label key={p} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="npreset"
                  checked={preset === p}
                  onChange={() => setPreset(p)}
                  className="accent-accent"
                />
                {p}
              </label>
            ))}
          </div>
        </div>
      </div>

      {wakeAckAt ? (
        <p className="text-center text-xs font-medium text-green-300/95">
          Keep-awake enabled — screen should stay on while this tab is visible.
        </p>
      ) : null}

      {wakeMsg ? (
        <p className="text-center text-xs text-amber-200/90">{wakeMsg}</p>
      ) : null}

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error ? (
        <p className="rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-3 text-center text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
