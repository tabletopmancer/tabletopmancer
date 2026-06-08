import { dispatchDelta, getState } from "$lib/server/table-state.js";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

type PlayerAction = "approve" | "deny" | "revoke";

type PlayerEventType = Extract<
  DeltaEvent,
  { type: "player:approved" | "player:denied" | "player:revoked" }
>["type"];

const actionEvents: Record<PlayerAction, PlayerEventType> = {
  approve: "player:approved",
  deny: "player:denied",
  revoke: "player:revoked",
};

async function dispatchPlayerAction(
  tableId: string,
  playerId: string,
  action: PlayerAction,
): Promise<void> {
  const state = await getState(tableId);
  if (!state.players.some((p) => p.id === playerId)) error(404, "Player not found");
  await dispatchDelta(tableId, { type: actionEvents[action], playerId });
}

export const POST: RequestHandler = async ({ params, request, locals }) => {
  if (locals.role !== "DM") error(403, "Forbidden");
  const { id: tableId, playerId } = params;
  const { action } = (await request.json()) as { action: PlayerAction };
  await dispatchPlayerAction(tableId, playerId, action);
  return json({ ok: true });
};
