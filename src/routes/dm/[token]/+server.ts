import { createDmSession, isLoginToken } from "$lib/server/dm.js";
import { error, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, cookies }) => {
  if (!isLoginToken(params.token)) error(404, "Not found");

  cookies.set("ttm_dm", createDmSession(), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect(302, "/");
};
