"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createActiveGame } from "@/app/host/actions";
import type { BallPreset } from "@/lib/bingo";
import type { WinPattern } from "@/lib/bingo/winPattern";
import { WIN_PATTERN_OPTIONS } from "@/lib/bingo/winPattern";

export function HostStartForm() {
  const router = useRouter();
  const [preset, setPreset] = useState<BallPreset>("US-75");
  const [winPattern, setWinPattern] = useState<WinPattern>("straight_line");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onStart() {
    setError(null);
    startTransition(async () => {
      try {
        await createActiveGame(preset, winPattern);
        router.refresh();
        router.push("/host/control");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start game");
      }
    });
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card/30 p-4">
      <h2 className="text-sm font-medium text-foreground">New game</h2>
      <p className="text-sm text-muted">
        Choose a ball set, then start. You can run many rounds in the same
        hosting session (daily session limits still apply in the database).
      </p>
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium uppercase tracking-wide text-muted">
          Ball set
        </legend>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input
            type="radio"
            name="preset"
            checked={preset === "US-75"}
            onChange={() => setPreset("US-75")}
            className="accent-accent"
          />
          US 75-ball (B-I-N-G-O columns)
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input
            type="radio"
            name="preset"
            checked={preset === "UK-90"}
            onChange={() => setPreset("UK-90")}
            className="accent-accent"
          />
          UK 90-ball
        </label>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium uppercase tracking-wide text-muted">
          Win pattern
        </legend>
        <p className="text-xs text-muted">
          Shown on the TV so players know what wins (paper cards).
        </p>
        <select
          value={winPattern}
          onChange={(e) => setWinPattern(e.target.value as WinPattern)}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
        >
          {WIN_PATTERN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label} — {o.description}
            </option>
          ))}
        </select>
      </fieldset>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="button"
        disabled={pending}
        onClick={onStart}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-sm shadow-black/20 transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Starting…" : "Start game"}
      </button>
    </section>
  );
}
