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
  const [open, setOpen]           = useState(false);
  const [copied, setCopied]       = useState(false);
  const [connected, setConnected] = useState(false);
  const [shareOk, setShareOk]     = useState(false);

  const storageKey = useMemo(() => `${STORAGE_PREFIX}${gameId}`, [gameId]);

  useEffect(() => {
    try { setConnected(localStorage.getItem(storageKey) === "1"); } catch { /**/ }
    setShareOk(typeof navigator !== "undefined" && !!navigator.share);
  }, [storageKey]);

  function markConnected(next: boolean) {
    setConnected(next);
    try { localStorage.setItem(storageKey, next ? "1" : "0"); } catch { /**/ }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(displayUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /**/ }
  }

  async function onShare() {
    if (!shareOk) return;
    try {
      await navigator.share({ title: "Bingo TV Display", url: displayUrl });
    } catch { /* user cancelled */ }
  }

  // QR code via free public API — no npm package needed, works on any browser
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&bgcolor=ffffff&color=09090b&data=${encodeURIComponent(displayUrl)}`;

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-medium text-foreground">TV display</h2>
        <span className={`rounded px-2 py-0.5 text-xs ${
          connected ? "bg-emerald-950/50 text-emerald-300" : "bg-amber-950/50 text-amber-300"
        }`}>
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
          Open display ↗
        </a>
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {open ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/75 p-4 sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-background p-5 shadow-2xl">

            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Connect TV Display</h3>
                <p className="mt-0.5 text-xs text-muted">Works on any device — phone, laptop, tablet, smart TV</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-3 rounded-md p-1 text-muted transition hover:text-foreground"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* ── QR Code ──────────────────────────────────────────────── */}
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-xl bg-white p-2 shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrSrc}
                  alt="QR code for TV display"
                  width={180}
                  height={180}
                  className="block rounded-lg"
                />
              </div>
              <p className="text-center text-xs text-muted">
                📷 Scan with any camera or QR app
              </p>
            </div>

            {/* ── Instructions by device ───────────────────────────────── */}
            <div className="rounded-lg border border-border bg-card/40 p-3 space-y-2 text-xs text-muted">
              <p className="font-semibold text-foreground/80 uppercase tracking-wide text-[10px]">How to get it on your TV</p>
              <div className="space-y-1.5">
                <p>📱 <span className="text-foreground/80 font-medium">iPhone/iPad:</span> Tap <em>Share Link</em> below → AirPlay or AirDrop to Apple TV, or copy to open on your TV's browser.</p>
                <p>🤖 <span className="text-foreground/80 font-medium">Android:</span> Tap <em>Share Link</em> → Cast or send to TV.</p>
                <p>💻 <span className="text-foreground/80 font-medium">Laptop:</span> Click <em>Open Display</em> then in Chrome do ⋮ → Cast… to cast that tab.</p>
                <p>📺 <span className="text-foreground/80 font-medium">Smart TV browser:</span> Scan the QR code with the TV's camera or type the URL below.</p>
              </div>
            </div>

            {/* ── URL input ────────────────────────────────────────────── */}
            <div>
              <p className="mb-1 text-xs text-muted">Display URL</p>
              <input
                readOnly
                value={displayUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="w-full rounded-lg border border-border bg-card px-2.5 py-2 font-mono text-[11px] text-foreground/90 cursor-text"
              />
            </div>

            {/* ── Action buttons ───────────────────────────────────────── */}
            <div className="flex flex-wrap gap-2">
              {/* Share (primary on mobile — uses native iOS/Android share sheet) */}
              {shareOk ? (
                <button
                  type="button"
                  onClick={onShare}
                  className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90"
                >
                  Share Link
                </button>
              ) : null}
              <button
                type="button"
                onClick={onCopy}
                className="flex-1 rounded-xl border border-border bg-card/50 px-4 py-3 text-sm font-medium text-foreground transition hover:border-muted"
              >
                {copied ? "✓ Copied!" : "Copy Link"}
              </button>
              <a
                href={displayUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-xl border border-border bg-card/50 px-4 py-3 text-center text-sm font-medium text-foreground transition hover:border-muted"
              >
                Open Display ↗
              </a>
            </div>

            {/* ── Confirm status ───────────────────────────────────────── */}
            <div className="flex gap-2 pt-1 border-t border-border">
              <button
                type="button"
                onClick={() => { markConnected(false); setOpen(false); }}
                className="flex-1 rounded-xl border border-border bg-card/40 py-2.5 text-sm text-muted transition hover:text-foreground"
              >
                Not connected yet
              </button>
              <button
                type="button"
                onClick={() => { markConnected(true); setOpen(false); }}
                className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
              >
                Confirm connected ✓
              </button>
            </div>

          </div>
        </div>
      ) : null}
    </section>
  );
}
