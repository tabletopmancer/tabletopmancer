import { TABLETOPMANCER_HOME } from "$env/static/private";
import mime from "$lib/mime.js";
import { error } from "@sveltejs/kit";
import fs from "fs/promises";
import path from "path";
import type { RequestHandler } from "./$types";

const savesDir = path.resolve(TABLETOPMANCER_HOME, "saves");

/** Resolves an asset path, throwing 404 if it escapes the table's codexes directory. */
function resolveAssetFile(tableId: string, assetPath: string): string {
  const codexesDir = path.resolve(savesDir, tableId, "codexes");
  if (!codexesDir.startsWith(savesDir + path.sep)) error(404, "Not found");
  const file = path.resolve(codexesDir, assetPath);
  if (!file.startsWith(codexesDir + path.sep)) error(404, "Not found");
  return file;
}

export const GET: RequestHandler = async ({ params }) => {
  // TODO: Check if the table is public if role is not DM
  // TODO: Check for permissions on certain data
  const file = resolveAssetFile(params.id, params.path);

  let data: Buffer;
  try {
    data = await fs.readFile(file);
  } catch {
    error(404, "Not found");
  }

  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": mime.getType(file) || "text/plain",
      "Content-Length": data.length.toString(),
    },
  });
};
