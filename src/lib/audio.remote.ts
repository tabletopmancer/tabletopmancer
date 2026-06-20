import { command } from "$app/server";
import { requireDm } from "$lib/server/auth.js";
import { dispatchTableEvent } from "$lib/server/table-state.js";
import * as v from "valibot";

export const playAudio = command(
  v.object({ tableId: v.string(), url: v.pipe(v.string(), v.nonEmpty()), name: v.string() }),
  async (arg) => {
    requireDm();
    await dispatchTableEvent(arg.tableId, { type: "audio:played", url: arg.url, name: arg.name });
  },
);

export const stopAudio = command(v.object({ tableId: v.string() }), async (arg) => {
  requireDm();
  await dispatchTableEvent(arg.tableId, { type: "audio:stopped" });
});
