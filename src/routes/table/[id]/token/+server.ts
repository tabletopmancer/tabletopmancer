import { dispatchDelta } from "$lib/server/table-state.js";
import { error, json } from "@sveltejs/kit";
import { randomUUID } from "node:crypto";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ params, request, locals }) => {
  if (locals.role !== "DM") error(403, "Forbidden");

  const { name, imageUrl, position } = (await request.json()) as {
    name: string;
    imageUrl?: string;
    position: Position;
  };

  if (!name || !position) error(400, "Missing required fields");

  const token: Token = {
    id: randomUUID(),
    name,
    imageUrl,
    position,
  };

  await dispatchDelta(params.id, { type: "token:placed", token });

  return json({ ok: true, token });
};
