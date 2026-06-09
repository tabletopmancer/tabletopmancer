import { getTableEmitter } from "$lib/server/table-state.js";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ params, request, locals }) => {
  if (locals.role === "PLAYER" && !locals.player) error(403, "Forbidden");

  const body = (await request.json()) as { position?: unknown };
  const pos = body.position as Position | undefined;
  if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") {
    error(400, "Invalid position");
  }

  const player = locals.role === "DM" ? "DM" : locals.player!.name;
  const delta: DeltaEvent = { type: "ping", position: pos, player };
  getTableEmitter(params.id).emit("delta", delta);
  return json({ ok: true });
};
