/** How players win on their cards (informational for the room / TV). */

export const WIN_PATTERN_IDS = [
  "straight_line",
  "straight_line_across",
  "straight_line_down",
  "diagonal_line",
  "x_pattern",
  "postage_stamp",
  "four_corners",
  "four_corners_stamp",
  "four_stamps",
  "plus_sign",
  "diamond",
  "heart",
  "tree",
  "dollar_sign",
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
    value: "straight_line_across",
    label: "Straight line across",
    description: "Any complete horizontal row",
  },
  {
    value: "straight_line_down",
    label: "Straight line down",
    description: "Any complete vertical column",
  },
  {
    value: "diagonal_line",
    label: "Diagonal line",
    description: "Either diagonal across the card",
  },
  {
    value: "x_pattern",
    label: "X pattern",
    description: "Both diagonals on a 5×5 card",
  },
  {
    value: "postage_stamp",
    label: "Postage stamp",
    description: "Any 2×2 block in a corner",
  },
  {
    value: "four_corners",
    label: "Four corners",
    description: "All four corner spaces",
  },
  {
    value: "four_corners_stamp",
    label: "Four corners + stamp",
    description: "All four corners plus a 2×2 stamp in any corner",
  },
  {
    value: "four_stamps",
    label: "Four stamps",
    description: "A 2×2 stamp in every corner",
  },
  {
    value: "plus_sign",
    label: "Plus sign",
    description: "The middle row and the middle column",
  },
  {
    value: "diamond",
    label: "Diamond",
    description: "A diamond shape centered on the card",
  },
  {
    value: "heart",
    label: "Heart",
    description: "A heart shape",
  },
  {
    value: "tree",
    label: "Tree",
    description: "A tree (or plug) shape",
  },
  {
    value: "dollar_sign",
    label: "Dollar sign",
    description: "A dollar-sign shape",
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
