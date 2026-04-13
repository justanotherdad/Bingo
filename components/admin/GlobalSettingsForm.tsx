"use client";

import { useMemo, useState, useTransition } from "react";
import { updateGlobalSetting } from "@/app/admin/actions";

type Row = { key: string; value: unknown; is_public: boolean };

const LABELS: Record<string, string> = {
  maintenance_mode: "Maintenance mode (read-only / banner)",
  signup_enabled: "Allow new sign-ups",
  max_host_sessions_per_day: "Max host sessions per user per day",
  idle_timeout_minutes: "Idle timeout before auto-ending a game (minutes)",
  allow_new_host_sessions: "Allow starting new host sessions",
};

export function GlobalSettingsForm({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState(initialRows);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byKey = useMemo(() => {
    const m = new Map<string, Row>();
    rows.forEach((r) => m.set(r.key, r));
    return m;
  }, [rows]);

  function boolValue(key: string): boolean {
    const v = byKey.get(key)?.value;
    return v === true || v === "true";
  }

  function numValue(key: string, fallback: number): number {
    const v = byKey.get(key)?.value;
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() !== "") return Number(v);
    return fallback;
  }

  function save(key: string, value: unknown) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await updateGlobalSetting(key, value);
        setRows((prev) =>
          prev.map((r) => (r.key === key ? { ...r, value } : r))
        );
        setMessage("Saved.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      {message ? (
        <p className="text-sm text-emerald-400/90">{message}</p>
      ) : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <section className="space-y-3 rounded-lg border border-border bg-card/30 p-4">
        <h2 className="text-sm font-medium text-foreground">Toggles</h2>
        {["maintenance_mode", "signup_enabled", "allow_new_host_sessions"].map(
          (key) => (
            <label
              key={key}
              className="flex cursor-pointer items-center justify-between gap-4 border-b border-border/80 py-2 last:border-0"
            >
              <span className="text-sm text-foreground/90">
                {LABELS[key] ?? key}
              </span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border bg-card accent-accent"
                checked={boolValue(key)}
                disabled={pending}
                onChange={(e) => save(key, e.target.checked)}
              />
            </label>
          )
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card/30 p-4">
        <h2 className="text-sm font-medium text-foreground">Numbers</h2>
        <div className="space-y-3">
          <label className="block text-sm text-muted">
            {LABELS.max_host_sessions_per_day}
            <input
              type="number"
              min={1}
              max={100}
              className="mt-1 w-full rounded border border-border bg-card px-3 py-2 text-foreground"
              defaultValue={numValue("max_host_sessions_per_day", 5)}
              disabled={pending}
              onBlur={(e) =>
                save("max_host_sessions_per_day", Number(e.target.value))
              }
            />
          </label>
          <label className="block text-sm text-muted">
            {LABELS.idle_timeout_minutes}
            <input
              type="number"
              min={5}
              max={240}
              className="mt-1 w-full rounded border border-border bg-card px-3 py-2 text-foreground"
              defaultValue={numValue("idle_timeout_minutes", 60)}
              disabled={pending}
              onBlur={(e) =>
                save("idle_timeout_minutes", Number(e.target.value))
              }
            />
          </label>
        </div>
      </section>
    </div>
  );
}
