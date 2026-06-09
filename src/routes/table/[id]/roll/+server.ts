import { dispatchDelta, getState } from "$lib/server/table-state.js";
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

  if (locals.role === "PLAYER" && locals.player) {
    await captureInitiative(params.id, locals.player.id, roll.total);
  }

  return json({ ok: true, roll });
};

async function captureInitiative(
  tableId: string,
  playerId: string,
  rollTotal: number,
): Promise<void> {
  const state = await getState(tableId);
  if (!state.initiative?.active) return;

  const playerToken = state.tokens.find((t) => t.owner === playerId);
  if (!playerToken) return;

  const entry = state.initiative.entries.find(
    (e) => e.tokenId === playerToken.id && e.initiative === null,
  );
  if (!entry) return;

  const updatedEntries = [...state.initiative.entries]
    .map((e) =>
      e.tokenId === playerToken.id && e.initiative === null ? { ...e, initiative: rollTotal } : e,
    )
    .sort((a, b) => {
      if (a.initiative === null && b.initiative === null) return 0;
      if (a.initiative === null) return 1;
      if (b.initiative === null) return -1;
      return b.initiative - a.initiative;
    });

  await dispatchDelta(tableId, {
    type: "initiative:updated",
    tracker: { ...state.initiative, entries: updatedEntries },
  });
}
