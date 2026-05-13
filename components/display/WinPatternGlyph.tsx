import type { WinPattern } from "@/lib/bingo/winPattern";

const BG = "rgba(255,255,255,0.06)";
const HI = "rgba(168,85,247,0.85)";
const ST = "rgba(255,255,255,0.12)";

/** 5×5 grid — highlighted cells show the win pattern (US-style card mental model). */
function Cell({
  r,
  c,
  on,
}: {
  r: number;
  c: number;
  on: boolean;
}) {
  const x = 2 + c * 10;
  const y = 2 + r * 10;
  return (
    <rect
      x={x}
      y={y}
      width={9}
      height={9}
      rx={1.5}
      fill={on ? HI : BG}
      stroke={ST}
      strokeWidth={0.4}
    />
  );
}

function gridMask(
  pattern: WinPattern
): boolean[][] {
  const g: boolean[][] = Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => false)
  );
  const set = (r: number, c: number) => {
    g[r][c] = true;
  };

  switch (pattern) {
    case "straight_line":
    case "straight_line_across":
      for (let c = 0; c < 5; c++) set(2, c);
      break;
    case "straight_line_down":
      for (let r = 0; r < 5; r++) set(r, 2);
      break;
    case "diagonal_line":
      for (let i = 0; i < 5; i++) set(i, i);
      break;
    case "x_pattern":
      for (let i = 0; i < 5; i++) {
        set(i, i);
        set(i, 4 - i);
      }
      break;
    case "postage_stamp":
      for (let r = 0; r < 2; r++)
        for (let c = 0; c < 2; c++) set(r, c);
      break;
    case "four_corners":
      set(0, 0);
      set(0, 4);
      set(4, 0);
      set(4, 4);
      break;
    case "four_corners_stamp":
      // Four single corners + a 2×2 stamp in the top-left
      set(0, 0); set(0, 1);
      set(1, 0); set(1, 1);
      set(0, 4);
      set(4, 0);
      set(4, 4);
      break;
    case "four_stamps":
      // 2×2 stamp in every corner
      for (const [r0, c0] of [[0, 0], [0, 3], [3, 0], [3, 3]] as const) {
        set(r0, c0); set(r0, c0 + 1);
        set(r0 + 1, c0); set(r0 + 1, c0 + 1);
      }
      break;
    case "plus_sign":
      for (let i = 0; i < 5; i++) {
        set(2, i);
        set(i, 2);
      }
      break;
    case "diamond":
      set(0, 2);
      set(1, 1); set(1, 3);
      set(2, 0); set(2, 4);
      set(3, 1); set(3, 3);
      set(4, 2);
      break;
    case "heart":
      set(0, 0); set(0, 1); set(0, 3); set(0, 4);
      for (let c = 0; c < 5; c++) set(1, c);
      for (let c = 0; c < 5; c++) set(2, c);
      set(3, 1); set(3, 2); set(3, 3);
      set(4, 2);
      break;
    case "tree":
      set(0, 2);
      set(1, 1); set(1, 2); set(1, 3);
      for (let c = 0; c < 5; c++) set(2, c);
      set(3, 2);
      set(4, 2);
      break;
    case "dollar_sign":
      set(0, 1); set(0, 2); set(0, 3);
      set(1, 1); set(1, 2);
      set(2, 1); set(2, 2); set(2, 3);
      set(3, 2); set(3, 3);
      set(4, 1); set(4, 2); set(4, 3);
      break;
    case "full_board":
      for (let r = 0; r < 5; r++)
        for (let c = 0; c < 5; c++) set(r, c);
      break;
    case "double_line":
      for (let c = 0; c < 5; c++) {
        set(0, c);
        set(4, c);
      }
      break;
    default:
      for (let c = 0; c < 5; c++) set(2, c);
  }

  return g;
}

export function WinPatternGlyph({
  pattern,
  size = 52,
  title,
}: {
  pattern: WinPattern;
  size?: number | string;
  title?: string;
}) {
  const g = gridMask(pattern);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 54 54"
      role="img"
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      {g.map((row, r) =>
        row.map((on, c) => (
          <Cell key={`cell-${r}-${c}`} r={r} c={c} on={on} />
        ))
      )}
    </svg>
  );
}
