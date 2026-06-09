import { dispatchDelta } from "$lib/server/table-state.js";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (locals.role !== "DM") error(403, "Forbidden");
  await dispatchDelta(params.id, { type: "map:removed", id: params.mapId });
  return json({ ok: true });
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  if (locals.role !== "DM") error(403, "Forbidden");
  const { position } = (await request.json()) as { position?: Position };
  if (!position || typeof position.x !== "number" || typeof position.y !== "number") {
    error(400, "Invalid position");
  }
  await dispatchDelta(params.id, { type: "map:moved", id: params.mapId, position });
  return json({ ok: true });
};
