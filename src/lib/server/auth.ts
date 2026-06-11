import { getRequestEvent } from "$app/server";
import { getSession } from "$lib/server/sessions.js";
import { getState } from "$lib/server/table-state.js";
import { error } from "@sveltejs/kit";

export function requireDm(): void {
  const { locals } = getRequestEvent();
  if (locals.role !== "DM") error(403, "DM only");
}

export async function sessionPlayerId(tableId: string): Promise<string | null> {
  const token = getRequestEvent().cookies.get("ttm_token");
  return token ? getSession(tableId, token) : null;
}

export async function requireSessionPlayerId(tableId: string): Promise<string> {
  const playerId = await sessionPlayerId(tableId);
  if (!playerId) error(403, "No session for this table");
  return playerId;
}

/** The approved player making the request, or null when the caller is the DM. */
export async function requireParticipant(tableId: string): Promise<Player | null> {
  const { locals } = getRequestEvent();
  if (locals.role === "DM") return null;

  const playerId = await sessionPlayerId(tableId);
  if (playerId) {
    const state = await getState(tableId);
    const player = state.players.find((p) => p.id === playerId && p.status === "approved");
    if (player) return player;
  }
  error(403, "Not a member of this table");
}
