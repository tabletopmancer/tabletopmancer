import { query } from "$app/server";
import { getState, getTableEmitter, trackConnection } from "$lib/server/table-state.js";

export const boardLive = query.live("unchecked", async function* (arg: string): AsyncGenerator<
  BoardState | DeltaEvent
> {
  const sep = arg.lastIndexOf("|");
  const tableId = arg.slice(0, sep);
  const role = arg.slice(sep + 1);

  const queue: DeltaEvent[] = [];
  let notify: (() => void) | null = null;

  const handler = (delta: DeltaEvent) => {
    if (delta.type === "dice:rolled" && delta.roll.private && role !== "DM") return;
    queue.push(delta);
    const resolve = notify;
    notify = null;
    resolve?.();
  };

  const emitter = getTableEmitter(tableId);
  emitter.on("delta", handler);

  const disconnect = trackConnection(tableId, role);

  try {
    const state = await getState(tableId);
    const visibleState: BoardState =
      role !== "DM"
        ? { ...state, rollHistory: state.rollHistory.filter((r) => !r.private) }
        : state;
    yield visibleState;

    while (true) {
      if (queue.length === 0) {
        await new Promise<void>((resolve) => {
          notify = resolve;
        });
      }
      while (queue.length > 0) {
        yield queue.shift()!;
      }
    }
  } finally {
    emitter.off("delta", handler);
    disconnect();
  }
});
