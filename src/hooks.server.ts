import { isDmSecret, logDmLoginUrl } from "$lib/server/dm.js";
import { getSession } from "$lib/server/sessions.js";
import { getState } from "$lib/server/table-state.js";
import { error, redirect, type Handle, type RequestEvent } from "@sveltejs/kit";

logDmLoginUrl();

function findApprovedPlayer(players: Player[], id: string): Player | undefined {
  return players.find((p) => p.id === id && p.status === "approved");
}

async function authorizePlayer(event: RequestEvent, tableId: string): Promise<void> {
  const token = event.cookies.get("ttm_token");
  if (!token) redirect(302, `/join/${tableId}`);

  const playerId = await getSession(tableId, token);
  if (!playerId) redirect(302, `/join/${tableId}`);

  const state = await getState(tableId);
  const player = findApprovedPlayer(state.players, playerId);
  if (!player) redirect(302, `/join/${tableId}`);

  event.locals.player = player;
}

async function guardPlayer(event: RequestEvent): Promise<void> {
  if (event.url.pathname === "/") error(401, "Unauthorized");

  const tableMatch = event.url.pathname.match(/^\/table\/([^/]+)/);
  if (tableMatch) await authorizePlayer(event, tableMatch[1]);
}

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.role = isDmSecret(event.cookies.get("ttm_dm")) ? "DM" : "PLAYER";
  event.locals.player = null;

  if (event.locals.role !== "DM") await guardPlayer(event);

  return resolve(event);
};
