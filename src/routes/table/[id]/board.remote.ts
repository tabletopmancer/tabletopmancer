import { query } from "$app/server";
import { getState, getTableEmitter } from "$lib/server/table-state.js";

export const boardLive = query.live("unchecked", async function* (tableId: string): AsyncGenerator<
  BoardState | DeltaEvent
> {
  const queue: DeltaEvent[] = [];
  let notify: (() => void) | null = null;

  const handler = (delta: DeltaEvent) => {
    queue.push(delta);
    const resolve = notify;
    notify = null;
    resolve?.();
  };

  const emitter = getTableEmitter(tableId);
  emitter.on("delta", handler);

  try {
    // Yield full initial state first so the client can bootstrap
    yield await getState(tableId);

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
  }
});
