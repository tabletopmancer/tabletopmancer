import { dispatchDelta, getState } from "$lib/server/table-state.js";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ params, request, locals }) => {
  if (locals.role !== "DM") error(403, "Forbidden");
  const { patch } = (await request.json()) as { patch?: FogPatch };
  if (
    !patch ||
    (patch.mode !== "reveal" && patch.mode !== "hide") ||
    typeof patch.x !== "number" ||
    typeof patch.y !== "number" ||
    typeof patch.radius !== "number"
  ) {
    error(400, "Invalid fog patch");
  }
  const state = await getState(params.id);
  if (!state.maps.some((m) => m.id === params.mapId)) error(404, "Map not found");
  await dispatchDelta(params.id, { type: "fog:updated", mapId: params.mapId, patch });
  return json({ ok: true });
};
