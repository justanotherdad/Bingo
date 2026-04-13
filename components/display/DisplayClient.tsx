"use client";

import { useEffect, useRef, useState } from "react";
import { playDrawChime, resumeAudioContext } from "@/lib/audio/drawChime";
import type { BallPreset } from "@/lib/bingo";
import { BingoStage } from "@/components/display/BingoStage";

type DrawPayload = {
  id: string;
  number: number;
  draw_order: number;
  created_at: string;
};

type ApiResponse = {
  ball_preset: BallPreset;
  status: string;
  draws: DrawPayload[];
  latest: DrawPayload | null;
  error?: string;
};

const SOUND_KEY = "bingo-display-sound";

export function DisplayClient({
  gameId,
  token,
}: {
  gameId: string;
  token: string;
}) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [animNonce, setAnimNonce] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [unlocked, setUnlocked] = useState(false);

  const soundOnRef = useRef(soundOn);
  const unlockedRef = useRef(unlocked);
  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);
  useEffect(() => {
    unlockedRef.current = unlocked;
  }, [unlocked]);

  const firstPoll = useRef(true);
  const lastLatestId = useRef<string | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(SOUND_KEY);
      if (v === "0") setSoundOn(false);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    firstPoll.current = true;
    lastLatestId.current = null;
  }, [gameId, token]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const r = await fetch(
          `/api/game/${gameId}/display?t=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );
        const json = (await r.json()) as ApiResponse;
        if (cancelled) return;
        if (!r.ok) {
          setError(json.error ?? "Could not load game");
          setData(null);
          return;
        }
        setError(null);
        setData(json);

        const latest = json.latest;
        if (latest) {
          const isFirstPoll = firstPoll.current;
          const changed = lastLatestId.current !== latest.id;
          if (!isFirstPoll && changed) {
            setAnimNonce((n) => n + 1);
            if (soundOnRef.current && unlockedRef.current) {
              void resumeAudioContext();
              playDrawChime();
            }
          }
          lastLatestId.current = latest.id;
        } else {
          lastLatestId.current = null;
        }
        firstPoll.current = false;
      } catch {
        if (!cancelled) setError("Network error");
      }
    }

    void poll();
    const id = window.setInterval(poll, 500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [gameId, token]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  async function unlockFromGesture() {
    await resumeAudioContext();
    playDrawChime();
    setUnlocked(true);
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-lg text-red-300">{error}</p>
        <p className="max-w-md text-sm text-muted">
          Check the display link (game id + token). The game may have ended.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        Loading…
      </div>
    );
  }

  if (data.status !== "active") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-xl font-semibold text-foreground">Game ended</p>
        <p className="text-sm text-muted">You can close this window.</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-auto absolute right-4 top-4 z-20 flex flex-wrap items-center gap-2">
        {!unlocked ? (
          <button
            type="button"
            onClick={unlockFromGesture}
            className="rounded-md border border-border bg-card/90 px-3 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur"
          >
            Tap to enable sound
          </button>
        ) : null}
        <button
          type="button"
          onClick={toggleSound}
          className="rounded-md border border-border bg-card/90 px-3 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur"
        >
          Sound: {soundOn ? "on" : "off"}
        </button>
      </div>

      <BingoStage
        preset={data.ball_preset}
        draws={data.draws}
        latest={data.latest}
        animNonce={animNonce}
      />
    </div>
  );
}
