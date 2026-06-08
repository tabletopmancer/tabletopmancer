import { dispatchDelta, getState } from "$lib/server/table-state.js";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  const { id: tableId, tokenId } = params;
  const body = (await request.json()) as { position: Position } | { owner: string | null };

  const state = await getState(tableId);
  const token = state.tokens.find((t) => t.id === tokenId);
  if (!token) error(404, "Token not found");

  if ("position" in body) {
    const canMove =
      locals.role === "DM" || (locals.player !== null && token.owner === locals.player.id);
    if (!canMove) error(403, "Cannot move this token");
    await dispatchDelta(tableId, { type: "token:moved", id: tokenId, position: body.position });
    return json({ ok: true });
  }

  if ("owner" in body) {
    if (locals.role !== "DM") error(403, "Only DM can assign token ownership");
    await dispatchDelta(tableId, {
      type: "token:owner-assigned",
      id: tokenId,
      owner: body.owner ?? undefined,
    });
    return json({ ok: true });
  }

  error(400, "Invalid request body");
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (locals.role !== "DM") error(403, "Only DM can remove tokens");

  const { id: tableId, tokenId } = params;
  const state = await getState(tableId);
  if (!state.tokens.find((t) => t.id === tokenId)) error(404, "Token not found");

  await dispatchDelta(tableId, { type: "token:removed", id: tokenId });
  return json({ ok: true });
};
