export type BallPreset = "US-75" | "UK-90";

export function numberPool(preset: BallPreset): number[] {
  if (preset === "US-75") {
    return Array.from({ length: 75 }, (_, i) => i + 1);
  }
  return Array.from({ length: 90 }, (_, i) => i + 1);
}

/** US 75-ball column letter; UK-90 returns null (no standard letter groups here). */
export function letterForNumber(preset: BallPreset, n: number): "B" | "I" | "N" | "G" | "O" | null {
  if (preset !== "US-75") return null;
  if (n < 1 || n > 75) return null;
  if (n <= 15) return "B";
  if (n <= 30) return "I";
  if (n <= 45) return "N";
  if (n <= 60) return "G";
  return "O";
}

export function presetLabel(preset: BallPreset): string {
  return preset === "US-75" ? "US 75-ball" : "UK 90-ball";
}
