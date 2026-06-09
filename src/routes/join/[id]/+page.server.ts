import { createSession, getSession } from "$lib/server/sessions.js";
import { getState, dispatchTableEvent } from "$lib/server/table-state.js";
import { redirect } from "@sveltejs/kit";
import crypto from "node:crypto";
import type { Actions, PageServerLoad } from "./$types";

async function findExistingPlayer(
  tableId: string,
  token: string | undefined,
): Promise<Player | undefined> {
  if (!token) return undefined;
  const playerId = await getSession(tableId, token);
  if (!playerId) return undefined;
  const state = await getState(tableId);
  return state.players.find((p) => p.id === playerId);
}

function isRetryableStatus(status: Player["status"]): boolean {
  return status === "denied" || status === "revoked";
}

export const load: PageServerLoad = async ({ params, cookies }) => {
  const { id: tableId } = params;
  const player = await findExistingPlayer(tableId, cookies.get("ttm_token"));
  if (player && player.status === "approved") redirect(302, `/table/${tableId}`);
  return { player: player ?? null, tableId };
};

export const actions: Actions = {
  join: async ({ params, cookies, request }) => {
    const { id: tableId } = params;
    const data = await request.formData();
    const name = (data.get("name") as string | null)?.trim();

    if (!name) return { error: "Name is required" };

    const playerId = crypto.randomUUID();
    const token = crypto.randomUUID();
    const player: Player = { id: playerId, name, status: "pending" };

    await createSession(tableId, token, playerId);

    cookies.set("ttm_token", token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    await dispatchTableEvent(tableId, { type: "player:joined", player });
    redirect(302, `/join/${tableId}`);
  },

  retry: async ({ params, cookies }) => {
    const { id: tableId } = params;
    const token = cookies.get("ttm_token");
    const player = await findExistingPlayer(tableId, token);
    if (player && isRetryableStatus(player.status)) {
      cookies.delete("ttm_token", { path: "/" });
    }
    redirect(302, `/join/${tableId}`);
  },
};
