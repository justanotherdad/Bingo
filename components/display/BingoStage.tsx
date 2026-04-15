import { letterForNumber, presetLabel, type BallPreset } from "@/lib/bingo";

type Draw = {
  id: string;
  number: number;
  draw_order: number;
};

// ─── Letter → colour mapping ───────────────────────────────────────────────
const LETTER_COLOR: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  B: { text: "#60a5fa", bg: "rgba(59,130,246,0.22)", border: "rgba(96,165,250,0.55)", glow: "0 0 22px rgba(59,130,246,0.5)" },
  I: { text: "#f87171", bg: "rgba(248,113,113,0.22)", border: "rgba(248,113,113,0.55)", glow: "0 0 22px rgba(248,113,113,0.5)" },
  N: { text: "#e5e7eb", bg: "rgba(229,231,235,0.14)", border: "rgba(229,231,235,0.40)", glow: "0 0 22px rgba(229,231,235,0.3)" },
  G: { text: "#4ade80", bg: "rgba(74,222,128,0.22)", border: "rgba(74,222,128,0.55)", glow: "0 0 22px rgba(74,222,128,0.5)" },
  O: { text: "#fb923c", bg: "rgba(251,146,60,0.22)",  border: "rgba(251,146,60,0.55)",  glow: "0 0 22px rgba(251,146,60,0.5)" },
};

// ─── US-75 full board columns ─────────────────────────────────────────────
const US75_COLS: { letter: "B" | "I" | "N" | "G" | "O"; start: number }[] = [
  { letter: "B", start: 1  },
  { letter: "I", start: 16 },
  { letter: "N", start: 31 },
  { letter: "G", start: 46 },
  { letter: "O", start: 61 },
];

// ─── UK-90 layout: 9 columns × 10 rows ────────────────────────────────────
function buildUK90Rows(): (number | null)[][] {
  // Standard UK Bingo board: numbers 1-90, each row has 5 numbers across 9 columns
  // Simple sequential layout for display purposes (not a playable card)
  const rows: (number | null)[][] = [];
  for (let row = 0; row < 9; row++) {
    const r: (number | null)[] = [];
    for (let col = 0; col < 10; col++) {
      const n = row * 10 + col + 1;
      r.push(n <= 90 ? n : null);
    }
    rows.push(r);
  }
  return rows;
}

// ─── Component ─────────────────────────────────────────────────────────────
export function BingoStage({
  preset,
  draws,
  latest,
  animNonce,
}: {
  preset: BallPreset;
  draws: Draw[];
  latest: Draw | null;
  animNonce: number;
}) {
  const calledSet  = new Set(draws.map((d) => d.number));
  const letter     = latest ? letterForNumber(preset, latest.number) : null;
  const letterCols = LETTER_COLOR[letter ?? ""] ?? null;
  const totalBalls = preset === "US-75" ? 75 : 90;
  const remaining  = totalBalls - draws.length;

  // Last 6 drawn (newest first, excluding very latest which is shown big)
  const recentHistory = [...draws].reverse().slice(1, 7);

  return (
    <div
      className="flex min-h-screen flex-col select-none overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 90% 50% at 50% -10%, hsl(263 40% 10% / 0.7), transparent 60%), " +
          "linear-gradient(to bottom, #09090b, #0f0f14)",
        minHeight: "100vh",
      }}
    >
      {/* ── Top strip: BINGO header + stats ─────────────────────────────── */}
      <header className="flex items-center justify-between px-6 pt-4 pb-2">
        <div className="flex items-end gap-1 leading-none">
          {(["B","I","N","G","O"] as const).map((l) => (
            <span
              key={l}
              className="text-3xl font-black sm:text-4xl"
              style={{ color: LETTER_COLOR[l].text, textShadow: LETTER_COLOR[l].glow }}
            >
              {l}
            </span>
          ))}
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <div className="text-2xl font-black text-white">{draws.length}</div>
            <div className="text-xs font-medium uppercase tracking-widest text-white/40">Called</div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{remaining}</div>
            <div className="text-xs font-medium uppercase tracking-widest text-white/40">Left</div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {Math.round((draws.length / totalBalls) * 100)}%
            </div>
            <div className="text-xs font-medium uppercase tracking-widest text-white/40">Done</div>
          </div>
        </div>
      </header>

      {/* ── Main body ────────────────────────────────────────────────────── */}
      <main className="flex flex-1 overflow-hidden">

        {/* ── Left: current ball + history ──────────────────────────────── */}
        <aside
          className="flex flex-col items-center justify-center gap-5 px-4 py-4"
          style={{ minWidth: "220px", maxWidth: "300px", flex: "0 0 260px" }}
        >
          {/* Current ball bubble */}
          {latest ? (
            <div
              key={`ball-${latest.id}-${animNonce}`}
              className="ball-pop flex flex-col items-center justify-center rounded-full"
              style={{
                width: "clamp(160px, 18vw, 220px)",
                height: "clamp(160px, 18vw, 220px)",
                border: `3px solid ${letterCols?.border ?? "rgba(255,255,255,0.2)"}`,
                boxShadow: letterCols?.glow
                  ? `${letterCols.glow}, 0 0 60px ${letterCols.border}`
                  : "none",
                background: letterCols?.bg ?? "rgba(255,255,255,0.06)",
              }}
            >
              {letter ? (
                <span
                  className="ball-letter text-2xl font-black sm:text-3xl"
                  style={{ color: letterCols?.text ?? "#fff", lineHeight: 1 }}
                >
                  {letter}
                </span>
              ) : null}
              <span
                className="font-black tabular-nums leading-none"
                style={{
                  fontSize: "clamp(3rem, 7vw, 5.5rem)",
                  color: letterCols?.text ?? "#fff",
                }}
              >
                {latest.number}
              </span>
              <span
                className="mt-1 text-xs font-semibold uppercase tracking-widest"
                style={{ color: letterCols?.text ?? "#999", opacity: 0.7 }}
              >
                {presetLabel(preset)}
              </span>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center rounded-full"
              style={{
                width: "clamp(160px, 18vw, 220px)",
                height: "clamp(160px, 18vw, 220px)",
                border: "2px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <span className="text-lg font-semibold text-white/30">Waiting…</span>
            </div>
          )}

          {/* Draw order label */}
          {latest ? (
            <p className="text-center text-xs font-medium text-white/30 tracking-wider uppercase">
              Ball #{latest.draw_order}
            </p>
          ) : null}

          {/* Recent history chips */}
          {recentHistory.length > 0 ? (
            <div className="w-full">
              <p className="mb-2 text-center text-xs font-medium uppercase tracking-widest text-white/25">
                Previous
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {recentHistory.map((d, i) => {
                  const l = letterForNumber(preset, d.number);
                  const c = LETTER_COLOR[l ?? ""] ?? null;
                  return (
                    <span
                      key={d.id}
                      className="inline-flex items-center justify-center rounded-full text-xs font-bold tabular-nums"
                      style={{
                        width: "34px", height: "34px",
                        border: `1.5px solid ${c?.border ?? "rgba(255,255,255,0.2)"}`,
                        color: c?.text ?? "#fff",
                        background: c?.bg ?? "rgba(255,255,255,0.05)",
                        opacity: 1 - i * 0.14,
                      }}
                    >
                      {d.number}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}
        </aside>

        {/* ── Right: full BINGO board ──────────────────────────────────── */}
        <div className="flex flex-1 items-center justify-center overflow-auto px-3 py-4">
          {preset === "US-75" ? (
            /* US-75: 5 columns × 15 rows grid */
            <div
              className="grid w-full"
              style={{
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "clamp(3px, 0.6vw, 8px)",
                maxWidth: "900px",
              }}
            >
              {US75_COLS.map(({ letter: col, start }) => {
                const c = LETTER_COLOR[col];
                return (
                  <div key={col} className="flex flex-col" style={{ gap: "clamp(3px, 0.6vw, 8px)" }}>
                    {/* Column header */}
                    <div
                      className="flex items-center justify-center rounded-lg font-black"
                      style={{
                        fontSize: "clamp(1rem, 2.2vw, 1.75rem)",
                        color: c.text,
                        textShadow: c.glow,
                        paddingBlock: "clamp(4px, 1vh, 10px)",
                        background: c.bg,
                        border: `1.5px solid ${c.border}`,
                      }}
                    >
                      {col}
                    </div>

                    {/* 15 number cells */}
                    {Array.from({ length: 15 }, (_, i) => {
                      const n    = start + i;
                      const isLatest = latest?.number === n;
                      const isCalled = calledSet.has(n);
                      return (
                        <div
                          key={n}
                          className={isCalled ? "ball-cell-called" : "ball-cell-uncalled"}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "clamp(4px, 0.8vw, 10px)",
                            fontSize: "clamp(0.65rem, 1.4vw, 1.05rem)",
                            fontWeight: 700,
                            fontVariantNumeric: "tabular-nums",
                            aspectRatio: "1",
                            border: isLatest
                              ? `2px solid ${c.border}`
                              : isCalled
                                ? `1.5px solid ${c.border}`
                                : "1px solid rgba(255,255,255,0.07)",
                            background: isLatest
                              ? c.bg
                              : isCalled
                                ? `${c.bg}`
                                : "rgba(255,255,255,0.03)",
                            color: isCalled ? c.text : "rgba(255,255,255,0.18)",
                            boxShadow: isLatest ? c.glow : "none",
                            transform: isLatest ? "scale(1.1)" : "scale(1)",
                            zIndex: isLatest ? 1 : "auto",
                            position: "relative",
                            transition: "background 0.3s, color 0.3s, box-shadow 0.3s, transform 0.3s",
                          }}
                        >
                          {n}
                          {/* Dot indicator for called */}
                          {isCalled && !isLatest ? (
                            <span
                              style={{
                                position: "absolute",
                                bottom: "clamp(2px,0.5vw,5px)",
                                right: "clamp(2px,0.5vw,5px)",
                                width: "clamp(3px,0.5vw,5px)",
                                height: "clamp(3px,0.5vw,5px)",
                                borderRadius: "50%",
                                background: c.text,
                                opacity: 0.6,
                              }}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            /* UK-90: 9×10 grid, no letter columns */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(10, 1fr)",
                gap: "clamp(3px, 0.5vw, 7px)",
                maxWidth: "860px",
                width: "100%",
              }}
            >
              {/* Header: 1–10 labels */}
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={`h-${i}`}
                  className="flex items-center justify-center font-bold"
                  style={{
                    fontSize: "clamp(0.6rem, 1.2vw, 0.85rem)",
                    color: "rgba(255,255,255,0.3)",
                    paddingBlock: "clamp(2px, 0.5vh, 6px)",
                  }}
                >
                  {i * 10 + 1}–{(i + 1) * 10}
                </div>
              ))}
              {/* Numbers 1-90 */}
              {Array.from({ length: 90 }, (_, i) => {
                const n = i + 1;
                const isLatest = latest?.number === n;
                const isCalled = calledSet.has(n);
                // Colour based on decade
                const decade = Math.floor((n - 1) / 10) % 5;
                const cols = [LETTER_COLOR.B, LETTER_COLOR.I, LETTER_COLOR.N, LETTER_COLOR.G, LETTER_COLOR.O];
                const c = cols[decade];
                return (
                  <div
                    key={n}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "clamp(3px, 0.6vw, 8px)",
                      fontSize: "clamp(0.6rem, 1.2vw, 0.9rem)",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      aspectRatio: "1",
                      border: isLatest
                        ? `2px solid ${c.border}`
                        : isCalled
                          ? `1.5px solid ${c.border}`
                          : "1px solid rgba(255,255,255,0.07)",
                      background: isCalled ? c.bg : "rgba(255,255,255,0.03)",
                      color: isCalled ? c.text : "rgba(255,255,255,0.18)",
                      boxShadow: isLatest ? c.glow : "none",
                      transform: isLatest ? "scale(1.12)" : "scale(1)",
                      position: "relative",
                      transition: "background 0.3s, color 0.3s, box-shadow 0.3s, transform 0.3s",
                    }}
                  >
                    {n}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── Waiting state overlay ─────────────────────────────────────────── */}
      {draws.length === 0 ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4"
          style={{ background: "rgba(9,9,11,0.85)", backdropFilter: "blur(4px)" }}
        >
          <div className="flex gap-2">
            {(["B","I","N","G","O"] as const).map((l, i) => (
              <span
                key={l}
                className="font-black"
                style={{
                  fontSize: "clamp(3rem, 8vw, 6rem)",
                  color: LETTER_COLOR[l].text,
                  textShadow: LETTER_COLOR[l].glow,
                  animation: `bingo-pulse 2s ease-in-out ${i * 0.18}s infinite`,
                }}
              >
                {l}
              </span>
            ))}
          </div>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-white/40">
            Waiting for the first ball…
          </p>
        </div>
      ) : null}
    </div>
  );
}
