import { TABLETOPMANCER_HOME } from "$env/static/private";
import { createSession, getSession } from "$lib/server/sessions.js";
import { tableDirName } from "$lib/server/table-dir.js";
import { getState, dispatchTableEvent } from "$lib/server/table-state.js";
import { error, redirect } from "@sveltejs/kit";
import fs from "fs-extra";
import crypto from "node:crypto";
import path from "node:path";
import type { Actions, PageServerLoad } from "./$types";

const MAX_NAME_LENGTH = 64;

const savesDir = path.join(TABLETOPMANCER_HOME, "saves");

async function tableExists(tableId: string): Promise<boolean> {
  return fs.pathExists(path.join(savesDir, tableDirName(tableId)));
}

async function findExistingPlayer(
  tableId: string,
  token: string | undefined,
): Promise<Player | null> {
  if (!token) return null;
  const playerId = await getSession(tableId, token);
  if (!playerId) return null;
  const state = await getState(tableId);
  return state.players.find((p) => p.id === playerId) ?? null;
}

function isRetryableStatus(status: Player["status"]): boolean {
  return status === "denied" || status === "revoked";
}

export const load: PageServerLoad = async ({ params, cookies }) => {
  const { id: tableId } = params;
  if (!(await tableExists(tableId))) error(404, "Table not found");
  const player = await findExistingPlayer(tableId, cookies.get("ttm_token"));
  if (player?.status === "approved") redirect(302, `/table/${tableId}`);
  return { player, tableId };
};

export const actions: Actions = {
  join: async ({ params, cookies, request }) => {
    const { id: tableId } = params;
    if (!(await tableExists(tableId))) error(404, "Table not found");
    const data = await request.formData();
    const name = (data.get("name") as string | null)?.trim();

    if (!name) return { error: "Name is required" };
    if (name.length > MAX_NAME_LENGTH) return { error: "Name is too long" };

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
