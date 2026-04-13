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
        <div className="mx-auto flex max-h-32 max-w-6xl flex-wrap justify-center gap-2 overflow-y-auto">
          {[...draws].reverse().map((d) => {
            const col = letterForNumber(preset, d.number);
            return (
              <span
                key={d.id}
                className="inline-flex min-w-[3.25rem] items-center justify-center rounded-lg border border-border/80 bg-background/60 px-2 py-1 text-sm tabular-nums text-foreground/95"
              >
                {col ? (
                  <span className="mr-1 text-[10px] font-bold text-accent">
                    {col}
                  </span>
                ) : null}
                {d.number}
              </span>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
