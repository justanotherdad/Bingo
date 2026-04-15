"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  playDrawChime,
  playGameOverFanfare,
  resumeAudioContext,
} from "@/lib/audio/drawChime";
import { letterForNumber, type BallPreset } from "@/lib/bingo";
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

// ─── Speech synthesis ─────────────────────────────────────────────────────────
let speechVoices: SpeechSynthesisVoice[] = [];

function loadVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  speechVoices = window.speechSynthesis.getVoices();
}

function announceNumber(number: number, letter: string | null) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  // e.g. "B. 7"  or just "64" for UK-90
  const label = letter ? `${letter}. ${number}` : String(number);
  const utt = new SpeechSynthesisUtterance(label);
  utt.rate = 0.88;
  utt.pitch = 1.05;
  utt.volume = 0.95;
  const preferred =
    speechVoices.find(
      (v) => v.lang.startsWith("en") && /google|natural/i.test(v.name)
    ) ??
    speechVoices.find((v) => v.lang.startsWith("en")) ??
    undefined;
  if (preferred) utt.voice = preferred;
  // Delay so the draw chime plays first
  window.setTimeout(() => window.speechSynthesis.speak(utt), 500);
}

// ─── Component ────────────────────────────────────────────────────────────────
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
  const [realtimeOk, setRealtimeOk] = useState<boolean | null>(null);

  const soundOnRef  = useRef(soundOn);
  const unlockedRef = useRef(unlocked);
  const lastLatestId   = useRef<string | null>(null);
  const firstLoad      = useRef(true);
  const presetRef      = useRef<BallPreset>("US-75");

  useEffect(() => { soundOnRef.current  = soundOn;  }, [soundOn]);
  useEffect(() => { unlockedRef.current = unlocked; }, [unlocked]);

  // Load persisted sound preference + speech voices
  useEffect(() => {
    try {
      if (localStorage.getItem(SOUND_KEY) === "0") setSoundOn(false);
    } catch { /* ignore */ }
    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    }
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      }
    };
  }, []);

  // Reset refs on game change
  useEffect(() => {
    lastLatestId.current = null;
    firstLoad.current = true;
  }, [gameId, token]);

  // ── Shared: fire animation + sound + speech ────────────────────────────────
  function triggerNewBall(number: number, preset: BallPreset) {
    const letter = letterForNumber(preset, number);
    setAnimNonce((n) => n + 1);
    if (soundOnRef.current && unlockedRef.current) {
      void resumeAudioContext();
      playDrawChime();
    }
    if (unlockedRef.current) announceNumber(number, letter);
  }

  function triggerGameOver() {
    if (soundOnRef.current && unlockedRef.current) {
      void resumeAudioContext();
      playGameOverFanfare();
    }
  }

  // ── REST fetch ─────────────────────────────────────────────────────────────
  const fetchState = useCallback(async () => {
    try {
      const url =
        `${window.location.origin}/api/game/${encodeURIComponent(gameId)}/display` +
        `?t=${encodeURIComponent(token)}`;
      const r    = await fetch(url, { cache: "no-store" });
      const text = await r.text();

      let json: ApiResponse;
      try { json = JSON.parse(text) as ApiResponse; }
      catch {
        setError(r.ok ? "Invalid server response." : `Server error (${r.status}).`);
        return;
      }
      if (!r.ok) { setError(json.error ?? "Could not load game"); setData(null); return; }

      setError(null);
      setData(json);
      presetRef.current = json.ball_preset;

      // Check for new ball caught by polling (Realtime may have missed it)
      const latest = json.latest;
      if (latest && !firstLoad.current && lastLatestId.current !== latest.id) {
        lastLatestId.current = latest.id;
        triggerNewBall(latest.number, json.ball_preset);
      } else if (latest) {
        lastLatestId.current = latest.id;
      }
      firstLoad.current = false;

      if (json.status !== "active") triggerGameOver();
    } catch {
      setError("Network error — retrying…");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, token]);

  // ── Supabase Realtime + polling fallback ───────────────────────────────────
  useEffect(() => {
    void fetchState(); // initial load

    const supabase = createClient();

    const channel = supabase
      .channel(`bingo-draws-${gameId}`)
      // Instant notification when a new draw is inserted
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "draws", filter: `game_id=eq.${gameId}` },
        (payload) => {
          const row = payload.new as { id: string; number: number; draw_order: number };

          // Skip if we already processed this (e.g., polling caught it first)
          if (lastLatestId.current === row.id) return;
          lastLatestId.current = row.id;

          // Optimistically append draw to local state (instant UI update)
          setData((prev) => {
            if (!prev) return prev;
            if (prev.draws.some((d) => d.id === row.id)) return prev;
            const newDraw: DrawPayload = {
              id: row.id,
              number: row.number,
              draw_order: row.draw_order,
              created_at: new Date().toISOString(),
            };
            return { ...prev, draws: [...prev.draws, newDraw], latest: newDraw };
          });

          if (!firstLoad.current) {
            triggerNewBall(row.number, presetRef.current);
          }
          firstLoad.current = false;
        }
      )
      // Watch for game status changes (completed / cancelled)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        () => void fetchState()
      )
      .subscribe((status) => setRealtimeOk(status === "SUBSCRIBED"));

    // Polling fallback at 5 s — catches any events Realtime missed
    const pollTimer = window.setInterval(() => void fetchState(), 5000);

    return () => {
      void supabase.removeChannel(channel);
      window.clearInterval(pollTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, token]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    try { localStorage.setItem(SOUND_KEY, next ? "1" : "0"); } catch { /* ignore */ }
  }

  async function unlockFromGesture() {
    await resumeAudioContext();
    playDrawChime();
    setUnlocked(true);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (error && !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center"
        style={{ backgroundColor: "#09090b", color: "#fecaca", minHeight: "100vh" }}>
        <p className="text-lg">{error}</p>
        <p className="max-w-md text-sm opacity-80">
          Check the display link. The game may have ended or the token may be wrong.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "#09090b", color: "#a1a1aa", minHeight: "100vh" }}>
        <div className="text-center">
          <div className="mb-3 text-5xl font-black tracking-widest opacity-20">BINGO</div>
          <p>Loading display…</p>
        </div>
      </div>
    );
  }

  if (data.status !== "active") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center"
        style={{ backgroundColor: "#09090b", color: "#fafafa", minHeight: "100vh" }}>
        <div className="text-6xl font-black tracking-widest opacity-25">BINGO</div>
        <p className="text-2xl font-semibold">Game over</p>
        <p className="text-sm opacity-60">
          {data.draws.length} of {data.ball_preset === "US-75" ? 75 : 90} balls were called.
        </p>
        <p className="mt-2 text-sm opacity-40">You can close this window.</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Live status — top right (small) */}
      <div className="pointer-events-none absolute right-3 top-3 z-20">
        <span
          title={
            realtimeOk === true
              ? "Live via Realtime"
              : realtimeOk === false
                ? "Using polling fallback"
                : "Connecting…"
          }
          className="inline-block h-2 w-2 rounded-full"
          style={{
            background:
              realtimeOk === true
                ? "#22c55e"
                : realtimeOk === false
                  ? "#f59e0b"
                  : "#6b7280",
            boxShadow: realtimeOk === true ? "0 0 6px #22c55e" : "none",
          }}
        />
      </div>

      {/* Sound — bottom left (TV-safe, easy to reach) */}
      <div className="pointer-events-auto fixed bottom-4 left-4 z-20 flex flex-col gap-2 sm:bottom-6 sm:left-6">
        {!unlocked ? (
          <button
            type="button"
            onClick={() => void unlockFromGesture()}
            className="rounded-lg border border-white/20 bg-black/70 px-3 py-2 text-xs font-medium text-white/90 shadow-lg backdrop-blur transition hover:bg-black/85"
          >
            🔊 Enable sound
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleSound}
            className="rounded-lg border border-white/20 bg-black/70 px-3 py-2 text-xs font-medium text-white/90 shadow-lg backdrop-blur transition hover:bg-black/85"
          >
            {soundOn ? "🔊" : "🔇"} Sound {soundOn ? "on" : "off"}
          </button>
        )}
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
