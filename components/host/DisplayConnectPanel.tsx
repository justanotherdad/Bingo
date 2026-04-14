"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_PREFIX = "bingo-display-connected:";

export function DisplayConnectPanel({
  gameId,
  displayUrl,
}: {
  gameId: string;
  displayUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);
  const [shareSupported, setShareSupported] = useState(false);
  const [castSupported, setCastSupported] = useState(false);
  const [casting, setCasting] = useState(false);
  const [castError, setCastError] = useState<string | null>(null);

  const storageKey = useMemo(() => `${STORAGE_PREFIX}${gameId}`, [gameId]);

  useEffect(() => {
    try {
      setConnected(localStorage.getItem(storageKey) === "1");
    } catch {
      setConnected(false);
    }
    setShareSupported(typeof navigator !== "undefined" && !!navigator.share);
    setCastSupported(
      typeof window !== "undefined" &&
        typeof (window as { PresentationRequest?: unknown }).PresentationRequest ===
          "function"
    );
  }, [storageKey]);

  function setConnectedState(next: boolean) {
    setConnected(next);
    try {
      localStorage.setItem(storageKey, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(displayUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  async function onShare() {
    if (!shareSupported) return;
    try {
      await navigator.share({
        title: "Bingo TV Display Link",
        text: "Open this on the TV browser:",
        url: displayUrl,
      });
    } catch {
      /* user cancelled */
    }
  }

  async function onCast() {
    setCastError(null);
    try {
      const PresentationRequestCtor = (window as unknown as {
        PresentationRequest?: new (url: string) => {
          start: () => Promise<{ addEventListener?: (...args: unknown[]) => void }>;
        };
      }).PresentationRequest;
      if (!PresentationRequestCtor) {
        setCastError("Casting picker is not supported on this browser.");
        return;
      }

      setCasting(true);
      const request = new PresentationRequestCtor(displayUrl);
      const connection = await request.start();
      if (connection?.addEventListener) {
        connection.addEventListener("terminate", () => {
          setConnectedState(false);
          setCasting(false);
        });
      }
      setConnectedState(true);
    } catch {
      setCastError("Could not start casting on this device.");
    } finally {
      setCasting(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-medium text-foreground">TV display</h2>
        <span
          className={`rounded px-2 py-0.5 text-xs ${
            connected
              ? "bg-emerald-950/50 text-emerald-300"
              : "bg-amber-950/50 text-amber-300"
          }`}
        >
          {connected ? "Connected" : "Not confirmed"}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-sm shadow-black/20 transition hover:opacity-90"
        >
          Connect TV display
        </button>
        <a
          className="inline-flex justify-center rounded-md border border-border bg-card/40 px-4 py-2 text-sm text-foreground transition hover:border-muted"
          href={displayUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open display (TV)
        </a>
      </div>

      <label className="block text-xs text-muted">
        Display link (copy to TV browser)
        <input
          readOnly
          className="mt-1 w-full rounded border border-border bg-card px-2 py-1 font-mono text-[11px] text-foreground"
          value={displayUrl}
        />
      </label>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg space-y-4 rounded-xl border border-border bg-background p-5 shadow-2xl">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">
                Connect TV display
              </h3>
              <p className="text-sm text-muted">
                1) Cast to TV (when supported) or open the link on the TV browser.
                2) When the animated stage appears, confirm below.
              </p>
            </div>

            <label className="block text-xs text-muted">
              TV display link
              <input
                readOnly
                className="mt-1 w-full rounded border border-border bg-card px-2 py-1 font-mono text-[11px] text-foreground"
                value={displayUrl}
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {castSupported ? (
                <button
                  type="button"
                  onClick={onCast}
                  disabled={casting}
                  className="rounded-md border border-border bg-card/40 px-3 py-2 text-sm text-foreground transition hover:border-muted disabled:opacity-50"
                >
                  {casting ? "Opening TV picker…" : "Cast to TV"}
                </button>
              ) : (
                <p className="w-full text-xs text-muted">
                  Cast picker not available in this browser. Use copy/share/open
                  link below.
                </p>
              )}
              <button
                type="button"
                onClick={onCopy}
                className="rounded-md border border-border bg-card/40 px-3 py-2 text-sm text-foreground transition hover:border-muted"
              >
                {copied ? "Copied" : "Copy link"}
              </button>
              {shareSupported ? (
                <button
                  type="button"
                  onClick={onShare}
                  className="rounded-md border border-border bg-card/40 px-3 py-2 text-sm text-foreground transition hover:border-muted"
                >
                  Share link
                </button>
              ) : null}
              <a
                href={displayUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-border bg-card/40 px-3 py-2 text-sm text-foreground transition hover:border-muted"
              >
                Open display now
              </a>
            </div>
            {castError ? <p className="text-sm text-red-400">{castError}</p> : null}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConnectedState(false);
                  setOpen(false);
                }}
                className="rounded-md border border-border bg-card/40 px-3 py-2 text-sm text-foreground transition hover:border-muted"
              >
                Not connected yet
              </button>
              <button
                type="button"
                onClick={() => {
                  setConnectedState(true);
                  setOpen(false);
                }}
                className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90"
              >
                Confirm connected
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
