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

  // Last 8 drawn (newest first, excluding very latest which is shown big)
  const recentHistory = [...draws].reverse().slice(1, 9);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background:
          "radial-gradient(ellipse 90% 50% at 50% -10%, hsl(263 40% 10% / 0.7), transparent 60%), " +
          "linear-gradient(to bottom, #09090b, #0f0f14)",
        userSelect: "none",
      }}
    >

      {/* ── Top bar: BINGO wordmark + stats ─────────────────────────────── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "clamp(6px,1.2vh,18px) clamp(10px,1.8vw,32px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
          gap: "1vw",
        }}
      >
        {/* BINGO wordmark */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "clamp(2px,0.4vw,8px)", lineHeight: 1 }}>
          {(["B","I","N","G","O"] as const).map((l) => (
            <span
              key={l}
              style={{
                fontSize: "clamp(1.6rem, 4vw, 3.8rem)",
                fontWeight: 900,
                color: LETTER_COLOR[l].text,
                textShadow: LETTER_COLOR[l].glow,
                letterSpacing: "-0.02em",
              }}
            >
              {l}
            </span>
          ))}
        </div>

        {/* Stats strip */}
        <div style={{ display: "flex", gap: "clamp(12px,2.5vw,48px)", alignItems: "center" }}>
          {[
            { label: "Called",    value: draws.length },
            { label: "Remaining", value: remaining },
            { label: "Complete",  value: `${Math.round((draws.length / totalBalls) * 100)}%` },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "clamp(1.2rem, 2.8vw, 2.6rem)",
                  fontWeight: 900,
                  color: "#fff",
                  lineHeight: 1,
                }}
              >
                {value}
              </div>
              <div
                style={{
                  fontSize: "clamp(0.5rem, 0.9vw, 0.75rem)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "rgba(255,255,255,0.35)",
                  marginTop: "2px",
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* ── Main body: current ball panel + board ───────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "clamp(180px, 22vw, 320px) 1fr",
          overflow: "hidden",
          minHeight: 0,
        }}
      >

        {/* ── Left panel: current ball + history ──────────────────────── */}
        <aside
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "clamp(8px, 1.5vh, 24px)",
            padding: "clamp(8px,1.5vh,20px) clamp(6px,1vw,16px)",
            borderRight: "1px solid rgba(255,255,255,0.07)",
            overflow: "hidden",
          }}
        >
          {/* Current ball bubble */}
          {latest ? (
            <div
              key={`ball-${latest.id}-${animNonce}`}
              className="ball-pop"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                width: "clamp(120px, 16vw, 240px)",
                height: "clamp(120px, 16vw, 240px)",
                border: `clamp(2px,0.3vw,5px) solid ${letterCols?.border ?? "rgba(255,255,255,0.2)"}`,
                boxShadow: letterCols?.glow
                  ? `${letterCols.glow}, 0 0 60px ${letterCols.border}`
                  : "none",
                background: letterCols?.bg ?? "rgba(255,255,255,0.06)",
                flexShrink: 0,
              }}
            >
              {letter ? (
                <span
                  className="ball-letter"
                  style={{
                    fontSize: "clamp(1rem, 2.2vw, 2.2rem)",
                    fontWeight: 900,
                    color: letterCols?.text ?? "#fff",
                    lineHeight: 1,
                  }}
                >
                  {letter}
                </span>
              ) : null}
              <span
                style={{
                  fontSize: "clamp(2.4rem, 6vw, 6rem)",
                  fontWeight: 900,
                  color: letterCols?.text ?? "#fff",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {latest.number}
              </span>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                width: "clamp(120px, 16vw, 240px)",
                height: "clamp(120px, 16vw, 240px)",
                border: "2px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.03)",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: "clamp(0.8rem, 1.4vw, 1.2rem)",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                Waiting…
              </span>
            </div>
          )}

          {/* Ball # label */}
          {latest ? (
            <p
              style={{
                fontSize: "clamp(0.55rem, 0.9vw, 0.8rem)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "rgba(255,255,255,0.28)",
                margin: 0,
              }}
            >
              Ball #{latest.draw_order} · {presetLabel(preset)}
            </p>
          ) : null}

          {/* Recent history chips */}
          {recentHistory.length > 0 ? (
            <div style={{ width: "100%" }}>
              <p
                style={{
                  fontSize: "clamp(0.5rem, 0.8vw, 0.65rem)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: "rgba(255,255,255,0.22)",
                  textAlign: "center",
                  marginBottom: "clamp(4px,0.8vh,10px)",
                }}
              >
                Previous
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: "clamp(3px,0.5vw,7px)",
                }}
              >
                {recentHistory.map((d, i) => {
                  const l = letterForNumber(preset, d.number);
                  const c = LETTER_COLOR[l ?? ""] ?? null;
                  return (
                    <span
                      key={d.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                        width: "clamp(28px, 3.2vw, 48px)",
                        height: "clamp(28px, 3.2vw, 48px)",
                        fontSize: "clamp(0.6rem, 1.1vw, 0.95rem)",
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        border: `1.5px solid ${c?.border ?? "rgba(255,255,255,0.2)"}`,
                        color: c?.text ?? "#fff",
                        background: c?.bg ?? "rgba(255,255,255,0.05)",
                        opacity: 1 - i * 0.11,
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "clamp(6px,1vh,16px) clamp(8px,1.2vw,20px)",
            overflow: "hidden",
            minWidth: 0,
            minHeight: 0,
          }}
        >
          {preset === "US-75" ? (
            /* US-75: 5 columns (B/I/N/G/O) × 15 rows — fills the landscape panel */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "clamp(3px, 0.5vw, 8px)",
                width: "100%",
                height: "100%",
                maxWidth: "min(100%, calc(100vh * 1.4))",
              }}
            >
              {US75_COLS.map(({ letter: col, start }) => {
                const c = LETTER_COLOR[col];
                return (
                  <div
                    key={col}
                    style={{
                      display: "grid",
                      gridTemplateRows: "auto repeat(15, 1fr)",
                      gap: "clamp(3px, 0.5vw, 8px)",
                      minHeight: 0,
                    }}
                  >
                    {/* Column header */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "clamp(1rem, 2vw, 2rem)",
                        fontWeight: 900,
                        color: c.text,
                        textShadow: c.glow,
                        background: c.bg,
                        border: `1.5px solid ${c.border}`,
                        borderRadius: "clamp(4px, 0.6vw, 10px)",
                        paddingBlock: "clamp(3px, 0.6vh, 10px)",
                      }}
                    >
                      {col}
                    </div>

                    {/* 15 number cells */}
                    {Array.from({ length: 15 }, (_, i) => {
                      const n        = start + i;
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
                            borderRadius: "clamp(3px, 0.5vw, 8px)",
                            fontSize: "clamp(0.6rem, 1.2vw, 1.1rem)",
                            fontWeight: 700,
                            fontVariantNumeric: "tabular-nums",
                            border: isLatest
                              ? `2px solid ${c.border}`
                              : isCalled
                                ? `1.5px solid ${c.border}`
                                : "1px solid rgba(255,255,255,0.07)",
                            background: isLatest
                              ? c.bg
                              : isCalled
                                ? c.bg
                                : "rgba(255,255,255,0.03)",
                            color: isCalled ? c.text : "rgba(255,255,255,0.18)",
                            boxShadow: isLatest ? c.glow : "none",
                            transform: isLatest ? "scale(1.08)" : "scale(1)",
                            transition: "background 0.3s, color 0.3s, box-shadow 0.3s, transform 0.3s",
                            position: "relative",
                            minHeight: 0,
                            minWidth: 0,
                          }}
                        >
                          {n}
                          {isCalled && !isLatest ? (
                            <span
                              style={{
                                position: "absolute",
                                bottom: "clamp(2px,0.4vw,4px)",
                                right: "clamp(2px,0.4vw,4px)",
                                width: "clamp(3px,0.4vw,5px)",
                                height: "clamp(3px,0.4vw,5px)",
                                borderRadius: "50%",
                                background: c.text,
                                opacity: 0.55,
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
            /* UK-90: 10 columns × 9 rows + header row */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(10, 1fr)",
                gridTemplateRows: "auto repeat(9, 1fr)",
                gap: "clamp(3px, 0.45vw, 7px)",
                width: "100%",
                height: "100%",
                maxWidth: "min(100%, calc(100vh * 1.8))",
              }}
            >
              {/* Decade header row */}
              {Array.from({ length: 10 }, (_, i) => {
                const cols = [LETTER_COLOR.B, LETTER_COLOR.I, LETTER_COLOR.N, LETTER_COLOR.G, LETTER_COLOR.O];
                const c = cols[i % 5];
                return (
                  <div
                    key={`h-${i}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "clamp(0.5rem, 0.9vw, 0.8rem)",
                      fontWeight: 700,
                      color: c.text,
                      background: c.bg,
                      border: `1px solid ${c.border}`,
                      borderRadius: "clamp(3px, 0.5vw, 8px)",
                      paddingBlock: "clamp(2px, 0.5vh, 6px)",
                    }}
                  >
                    {i === 9 ? "81–90" : `${i * 10 + 1}–${(i + 1) * 10}`}
                  </div>
                );
              })}
              {/* Numbers 1-90, row-major */}
              {Array.from({ length: 90 }, (_, i) => {
                const n        = i + 1;
                const col      = (i % 10);
                const isLatest = latest?.number === n;
                const isCalled = calledSet.has(n);
                const cols     = [LETTER_COLOR.B, LETTER_COLOR.I, LETTER_COLOR.N, LETTER_COLOR.G, LETTER_COLOR.O];
                const c        = cols[col % 5];
                return (
                  <div
                    key={n}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "clamp(3px, 0.5vw, 8px)",
                      fontSize: "clamp(0.55rem, 1.1vw, 0.95rem)",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      border: isLatest
                        ? `2px solid ${c.border}`
                        : isCalled
                          ? `1.5px solid ${c.border}`
                          : "1px solid rgba(255,255,255,0.07)",
                      background: isCalled ? c.bg : "rgba(255,255,255,0.03)",
                      color: isCalled ? c.text : "rgba(255,255,255,0.18)",
                      boxShadow: isLatest ? c.glow : "none",
                      transform: isLatest ? "scale(1.1)" : "scale(1)",
                      transition: "background 0.3s, color 0.3s, box-shadow 0.3s, transform 0.3s",
                      position: "relative",
                      minHeight: 0,
                      minWidth: 0,
                    }}
                  >
                    {n}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Waiting state overlay ─────────────────────────────────────────── */}
      {draws.length === 0 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "clamp(12px, 2.5vh, 36px)",
            background: "rgba(9,9,11,0.88)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div style={{ display: "flex", gap: "clamp(8px, 1.5vw, 24px)" }}>
            {(["B","I","N","G","O"] as const).map((l, i) => (
              <span
                key={l}
                style={{
                  fontSize: "clamp(3rem, 10vw, 9rem)",
                  fontWeight: 900,
                  color: LETTER_COLOR[l].text,
                  textShadow: LETTER_COLOR[l].glow,
                  animation: `bingo-pulse 2s ease-in-out ${i * 0.18}s infinite`,
                }}
              >
                {l}
              </span>
            ))}
          </div>
          <p
            style={{
              fontSize: "clamp(0.75rem, 1.4vw, 1.1rem)",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.3em",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            Waiting for the first ball…
          </p>
        </div>
      ) : null}
    </div>
  );
}
