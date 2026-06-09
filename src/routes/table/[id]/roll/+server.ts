import { dispatchDelta } from "$lib/server/table-state.js";
import { error, json } from "@sveltejs/kit";
import { randomUUID } from "node:crypto";
import type { RequestHandler } from "./$types";

const FORMULA_RE = /^(\d+)d(\d+)([+-]\d+)?$/i;

type ParsedFormula = { count: number; sides: number; modifier: number };

function parseFormula(formula: string): ParsedFormula | null {
  const m = formula.trim().match(FORMULA_RE);
  if (!m) return null;
  return { count: parseInt(m[1]), sides: parseInt(m[2]), modifier: m[3] ? parseInt(m[3]) : 0 };
}

function rollDice(count: number, sides: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
}

function guardPlayer(locals: App.Locals): void {
  if (locals.role === "PLAYER" && !locals.player) error(403, "Forbidden");
}

function buildRoll(
  locals: App.Locals,
  formula: string,
  privateFlag: boolean | undefined,
  parsed: ParsedFormula,
): DiceRoll {
  const isDM = locals.role === "DM";
  const dice = rollDice(parsed.count, parsed.sides);
  const total = dice.reduce((sum, d) => sum + d, 0) + parsed.modifier;
  return {
    id: randomUUID(),
    player: isDM ? "DM" : locals.player!.name,
    formula,
    dice,
    modifier: parsed.modifier,
    total,
    private: isDM && (privateFlag ?? true),
    timestamp: Date.now(),
  };
}

export const POST: RequestHandler = async ({ params, request, locals }) => {
  guardPlayer(locals);

  const { formula: rawFormula, private: privateFlag } = (await request.json()) as {
    formula: string;
    private?: boolean;
  };
  const formula = rawFormula?.trim();
  if (!formula) error(400, "Missing formula");

  const parsed = parseFormula(formula);
  if (!parsed) error(400, "Invalid dice formula");

  const roll = buildRoll(locals, formula, privateFlag, parsed);
  await dispatchDelta(params.id, { type: "dice:rolled", roll });
  return json({ ok: true, roll });
};
