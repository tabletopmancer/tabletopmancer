import { dispatchDelta, getState } from "$lib/server/table-state.js";
import { error, json } from "@sveltejs/kit";
import { randomUUID } from "node:crypto";
import type { RequestHandler } from "./$types";

function sortEntries(entries: InitiativeEntry[]): InitiativeEntry[] {
  return [...entries].sort((a, b) => {
    if (a.initiative === null && b.initiative === null) return 0;
    if (a.initiative === null) return 1;
    if (b.initiative === null) return -1;
    return b.initiative - a.initiative;
  });
}

export const POST: RequestHandler = async ({ params, request, locals }) => {
  if (locals.role !== "DM") error(403, "Forbidden");

  const body = (await request.json()) as {
    action: "activate" | "deactivate" | "add-npc" | "remove" | "turn";
    name?: string;
    initiative?: number;
    tokenId?: string;
    delta?: number;
  };

  const state = await getState(params.id);

  if (body.action === "activate") {
    const entries: InitiativeEntry[] = state.tokens
      .filter((t) => t.owner !== undefined)
      .map((t) => ({ tokenId: t.id, name: t.name, initiative: null, isNPC: false }));
    const tracker: InitiativeTracker = { active: true, entries, turn: 0 };
    await dispatchDelta(params.id, { type: "initiative:updated", tracker });
    return json({ ok: true });
  }

  if (body.action === "deactivate") {
    await dispatchDelta(params.id, { type: "initiative:updated", tracker: null });
    return json({ ok: true });
  }

  const tracker = state.initiative;
  if (!tracker) error(400, "Initiative tracker is not active");

  if (body.action === "add-npc") {
    if (!body.name?.trim() || body.initiative === undefined)
      error(400, "Missing name or initiative");
    const entry: InitiativeEntry = {
      tokenId: `npc:${randomUUID()}`,
      name: body.name.trim(),
      initiative: body.initiative,
      isNPC: true,
    };
    const updated: InitiativeTracker = {
      ...tracker,
      entries: sortEntries([...tracker.entries, entry]),
    };
    await dispatchDelta(params.id, { type: "initiative:updated", tracker: updated });
    return json({ ok: true });
  }

  if (body.action === "remove") {
    if (!body.tokenId) error(400, "Missing tokenId");
    const updated: InitiativeTracker = {
      ...tracker,
      entries: tracker.entries.filter((e) => e.tokenId !== body.tokenId),
    };
    await dispatchDelta(params.id, { type: "initiative:updated", tracker: updated });
    return json({ ok: true });
  }

  if (body.action === "turn") {
    if (body.delta === undefined) error(400, "Missing delta");
    const updated: InitiativeTracker = {
      ...tracker,
      turn: Math.max(0, tracker.turn + body.delta),
    };
    await dispatchDelta(params.id, { type: "initiative:updated", tracker: updated });
    return json({ ok: true });
  }

  error(400, "Unknown action");
};
