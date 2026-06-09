import { dispatchDelta } from "$lib/server/table-state.js";
import { error, json } from "@sveltejs/kit";
import { randomUUID } from "node:crypto";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ params, request, locals }) => {
  if (locals.role !== "DM") error(403, "Forbidden");
  const { assetUrl, position } = (await request.json()) as {
    assetUrl: string;
    position: Position;
  };
  if (!assetUrl || !position) error(400, "Missing required fields");
  const map: BoardMap = { id: randomUUID(), assetUrl, position, fog: [] };
  await dispatchDelta(params.id, { type: "map:placed", map });
  return json({ ok: true, map });
};
