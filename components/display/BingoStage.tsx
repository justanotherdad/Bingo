import { letterForNumber, presetLabel, type BallPreset } from "@/lib/bingo";

type Draw = {
  id: string;
  number: number;
  draw_order: number;
};

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
  const letter = latest ? letterForNumber(preset, latest.number) : null;
  const byLetter: Record<string, number[]> = { B: [], I: [], N: [], G: [], O: [] };
  if (preset === "US-75") {
    for (const d of draws) {
      const l = letterForNumber(preset, d.number);
      if (l && l in byLetter) byLetter[l].push(d.number);
    }
    Object.keys(byLetter).forEach((k) => byLetter[k].sort((a, b) => a - b));
  }

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_at_50%_0%,hsl(263_40%_14%/0.5),transparent_55%),linear-gradient(to_bottom,hsl(var(--background)),hsl(240_6%_6%))]">
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-8 pt-16">
        {latest ? (
          <div
            key={`${latest.id}-${animNonce}`}
            className="ball-pop flex flex-col items-center"
          >
            {letter ? (
              <span className="ball-letter text-5xl font-black tracking-tight text-white/90 sm:text-7xl md:text-8xl">
                {letter}
              </span>
            ) : null}
            <span
              className={`mt-2 font-black tabular-nums tracking-tight text-white ${
                letter ? "text-7xl sm:text-9xl md:text-[11rem]" : "text-8xl sm:text-[10rem] md:text-[12rem]"
              }`}
            >
              {latest.number}
            </span>
            <p className="mt-6 text-sm font-medium uppercase tracking-[0.25em] text-muted">
              {presetLabel(preset)}
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-2xl font-semibold text-foreground/90">
              Waiting for the first number…
            </p>
            <p className="mt-2 text-sm text-muted">
              The host draws from the phone controller.
            </p>
          </div>
        )}
      </div>

      <footer className="border-t border-border/80 bg-card/40 px-4 py-4 backdrop-blur">
        <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-muted">
          Numbers called ({draws.length})
        </p>
        {preset === "US-75" ? (
          <div className="mx-auto grid max-w-6xl gap-2">
            {(["B", "I", "N", "G", "O"] as const).map((col) => (
              <div
                key={col}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-background/40 px-3 py-2"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-accent/25 text-sm font-black text-accent">
                  {col}
                </span>
                {byLetter[col].length ? (
                  byLetter[col].map((n) => (
                    <span
                      key={`${col}-${n}`}
                      className={`inline-flex min-w-[2.5rem] items-center justify-center rounded-md border px-2 py-1 text-sm tabular-nums ${
                        latest?.number === n
                          ? "blink-latest border-accent bg-accent/20 text-accent-foreground"
                          : "border-border/80 bg-background/60 text-foreground/95"
                      }`}
                    >
                      {n}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted">No calls yet</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mx-auto flex max-h-32 max-w-6xl flex-wrap justify-center gap-2 overflow-y-auto">
            {[...draws].reverse().map((d) => (
              <span
                key={d.id}
                className={`inline-flex min-w-[3.25rem] items-center justify-center rounded-lg border px-2 py-1 text-sm tabular-nums ${
                  latest?.id === d.id
                    ? "blink-latest border-accent bg-accent/20 text-accent-foreground"
                    : "border-border/80 bg-background/60 text-foreground/95"
                }`}
              >
                {d.number}
              </span>
            ))}
          </div>
        )}
      </footer>
    </div>
  );
}
