// Per-player dice colors. Each player is assigned a distinct color when they
// join (see the join action); the color travels with every roll so the board
// can tint that player's dice and so the UI can show who is who at a glance.

// Distinct, readable palette assigned to players in join order. Wraps around
// once exhausted.
const PLAYER_COLORS = [
  "#7c3aed", // violet
  "#dc2626", // red
  "#2563eb", // blue
  "#16a34a", // green
  "#ea580c", // orange
  "#db2777", // pink
  "#0891b2", // cyan
  "#ca8a04", // amber
  "#9333ea", // purple
  "#0d9488", // teal
];

// Neutral tone reserved for the DM (who has no player record).
const DM_COLOR = "#52525b"; // zinc-600

/** The color for the next player to join, given how many already exist. */
export function assignPlayerColor(existingCount: number): string {
  return PLAYER_COLORS[existingCount % PLAYER_COLORS.length];
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

/** A stable palette color derived from a string — used as a fallback. */
function hashColor(key: string): string {
  return PLAYER_COLORS[hashString(key) % PLAYER_COLORS.length];
}

/**
 * The color for a player's dice. Honors the assigned color, falls back to a
 * stable per-name color for legacy players (who joined before colors existed),
 * and uses the neutral DM tone when there is no player (the DM).
 */
export function colorForPlayer(player: Player | null): string {
  if (!player) return DM_COLOR;
  return player.color ?? hashColor(player.name);
}

/** The color a roll should render with, with the same legacy fallback. */
export function colorForRoll(roll: DiceRoll): string {
  return roll.color ?? hashColor(roll.player);
}

/** Black or white numerals, whichever contrasts better against the die body. */
export function diceForeground(background: string): string {
  const hex = background.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1e1b2e" : "#f5f3ff";
}
