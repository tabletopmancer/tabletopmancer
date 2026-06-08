import { dispatchDelta } from "$lib/server/table-state.js";
import { error, json } from "@sveltejs/kit";
import { randomUUID } from "node:crypto";
import type { RequestHandler } from "./$types";

const FORMULA_RE = /^(\d+)d(\d+)([+-]\d+)?$/i;

function parseFormula(formula: string): { count: number; sides: number; modifier: number } | null {
  const m = formula.trim().match(FORMULA_RE);
  if (!m) return null;
  return {
    count: parseInt(m[1]),
    sides: parseInt(m[2]),
    modifier: m[3] ? parseInt(m[3]) : 0,
  };
}

function rollDice(count: number, sides: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
}

export const POST: RequestHandler = async ({ params, request, locals }) => {
  if (locals.role === "PLAYER" && !locals.player) error(403, "Forbidden");

  const body = (await request.json()) as { formula: string; private?: boolean };
  const formula = body.formula?.trim();
  if (!formula) error(400, "Missing formula");

  const parsed = parseFormula(formula);
  if (!parsed) error(400, "Invalid dice formula");

  const { count, sides, modifier } = parsed;
  const dice = rollDice(count, sides);
  const total = dice.reduce((sum, d) => sum + d, 0) + modifier;

  const roll: DiceRoll = {
    id: randomUUID(),
    player: locals.role === "DM" ? "DM" : locals.player!.name,
    formula,
    dice,
    modifier,
    total,
    private: locals.role === "DM" ? (body.private ?? true) : false,
    timestamp: Date.now(),
  };

  await dispatchDelta(params.id, { type: "dice:rolled", roll });

  return json({ ok: true, roll });
};
