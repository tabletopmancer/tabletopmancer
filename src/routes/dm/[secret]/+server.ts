import { isDmSecret } from "$lib/server/dm.js";
import { error, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, cookies }) => {
  if (!isDmSecret(params.secret)) error(404, "Not found");

  cookies.set("ttm_dm", params.secret, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect(302, "/");
};
