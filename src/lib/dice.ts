export const MAX_DICE_COUNT = 100;
export const MAX_DICE_SIDES = 1000;

const FORMULA_RE = /^(\d+)d(\d+)([+-]\d+)?$/i;

export type ParsedFormula = { count: number; sides: number; modifier: number };

function isRollable(count: number, sides: number): boolean {
  return count >= 1 && count <= MAX_DICE_COUNT && sides >= 2 && sides <= MAX_DICE_SIDES;
}

export function parseFormula(formula: string): ParsedFormula | null {
  const m = formula.trim().match(FORMULA_RE);
  if (!m) return null;
  const count = parseInt(m[1]);
  const sides = parseInt(m[2]);
  if (!isRollable(count, sides)) return null;
  return { count, sides, modifier: m[3] ? parseInt(m[3]) : 0 };
}
