/** How players win on their cards (informational for the room / TV). */

export const WIN_PATTERN_IDS = [
  "straight_line",
  "x_pattern",
  "postage_stamp",
  "four_corners",
  "full_board",
  "double_line",
] as const;

export type WinPattern = (typeof WIN_PATTERN_IDS)[number];

export const WIN_PATTERN_OPTIONS: {
  value: WinPattern;
  label: string;
  description: string;
}[] = [
  {
    value: "straight_line",
    label: "Straight line",
    description: "Any complete row, column, or diagonal",
  },
  {
    value: "x_pattern",
    label: "X pattern",
    description: "Both diagonals on a 5×5 card",
  },
  {
    value: "postage_stamp",
    label: "Postage stamp",
    description: "Any 2×2 block of marked numbers",
  },
  {
    value: "four_corners",
    label: "Four corners",
    description: "All four corner spaces",
  },
  {
    value: "full_board",
    label: "Full card / coverall",
    description: "Every space on the card",
  },
  {
    value: "double_line",
    label: "Double line",
    description: "Two distinct bingo lines",
  },
];

export function isWinPattern(s: string): s is WinPattern {
  return (WIN_PATTERN_IDS as readonly string[]).includes(s);
}

export function parseWinPattern(s: unknown): WinPattern {
  if (typeof s === "string" && isWinPattern(s)) return s;
  return "straight_line";
}
