"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  clearBoardAndNewGame,
  drawNextNumber,
  endHostSession,
} from "@/app/host/actions";
import { playDrawChime, resumeAudioContext } from "@/lib/audio/drawChime";
import type { BallPreset } from "@/lib/bingo";

export function HostControlPanel({
  initialPreset,
}: {
  initialPreset: BallPreset;
}) {
  const router = useRouter();
  const [preset, setPreset] = useState<BallPreset>(initialPreset);
  const [error, setError] = useState<string | null>(null);
  const [lastDraw, setLastDraw] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [wakeOn, setWakeOn] = useState(false);
  const [pending, startTransition] = useTransition();
  const wakeRef = useRef<WakeLockSentinel | null>(null);

  async function requestWakeLock() {
    try {
      if (!("wakeLock" in navigator)) {
        setError("Wake lock is not supported on this browser.");
        return;
      }
      wakeRef.current = await navigator.wakeLock.request("screen");
      setWakeOn(true);
      wakeRef.current.addEventListener("release", () => {
        setWakeOn(false);
      });
    } catch {
      setError("Could not enable keep-awake mode.");
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
    const onVisible = () => {
      if (document.visibilityState === "visible" && wakeOn) {
        void requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void releaseWakeLock();
    };
  }, [wakeOn]);

  function onDraw() {
    setError(null);
    startTransition(async () => {
      try {
        await resumeAudioContext();
        const res = await drawNextNumber();
        setLastDraw(String(res.number));
        playDrawChime();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Draw failed");
      }
    });
  }

  function onClear() {
    const ok = window.confirm(
      "Clear the board and start a new game? This ends the current game and starts a fresh one."
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      try {
        await clearBoardAndNewGame(preset);
        setLastDraw(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not reset");
      }
    });
  }

  async function onEndSession() {
    const ok = window.confirm(
      "End this session now? This closes the active game and returns you to Host."
    );
    if (!ok) return;
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

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={pending || ending}
          onClick={onDraw}
          className="rounded-xl border border-border bg-card py-6 text-lg font-semibold text-foreground shadow-lg shadow-black/30 transition hover:border-accent/50 disabled:opacity-50"
        >
          {pending ? "…" : "Draw next number"}
        </button>
        <button
          type="button"
          disabled={pending || ending}
          onClick={onClear}
          className="rounded-xl border border-red-900/60 bg-red-950/30 py-6 text-lg font-semibold text-red-100 transition hover:bg-red-950/50 disabled:opacity-50"
        >
          Clear board
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={pending || ending}
          onClick={() => {
            setError(null);
            if (wakeOn) {
              void releaseWakeLock();
            } else {
              void requestWakeLock();
            }
          }}
          className="rounded-xl border border-border bg-card/50 py-4 text-sm font-semibold text-foreground transition hover:border-accent/40 disabled:opacity-50"
        >
          {wakeOn ? "Keep awake: on (tap to disable)" : "Keep screen awake"}
        </button>
        <button
          type="button"
          disabled={pending || ending}
          onClick={onEndSession}
          className="rounded-xl border border-red-900/60 bg-red-950/30 py-4 text-sm font-semibold text-red-100 transition hover:bg-red-950/50 disabled:opacity-50"
        >
          {ending ? "Ending…" : "End session"}
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card/30 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Next round preset (clear board)
        </p>
        <div className="mt-2 flex gap-4 text-sm text-foreground">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="npreset"
              checked={preset === "US-75"}
              onChange={() => setPreset("US-75")}
              className="accent-accent"
            />
            US-75
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="npreset"
              checked={preset === "UK-90"}
              onChange={() => setPreset("UK-90")}
              className="accent-accent"
            />
            UK-90
          </label>
        </div>
      </div>

      {lastDraw ? (
        <p className="text-center text-sm text-muted">
          Last draw (this device):{" "}
          <span className="font-semibold text-foreground">{lastDraw}</span>
        </p>
      ) : null}
      {error ? (
        <p className="text-center text-sm text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
