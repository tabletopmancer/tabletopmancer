import { query } from "$app/server";
import { getState, getTableEmitter, trackConnection } from "$lib/server/table-state.js";

function isPrivateDiceRoll(delta: DeltaEvent, role: string): boolean {
  return delta.type === "dice:rolled" && delta.roll.private && role !== "DM";
}

function stateForRole(state: BoardState, role: string): BoardState {
  if (role === "DM") return state;
  return { ...state, rollHistory: state.rollHistory.filter((r) => !r.private) };
}

export const boardLive = query.live("unchecked", async function* (arg: string): AsyncGenerator<
  BoardState | DeltaEvent
> {
  const sep = arg.lastIndexOf("|");
  const tableId = arg.slice(0, sep);
  const role = arg.slice(sep + 1);

  const queue: DeltaEvent[] = [];
  let notify: (() => void) | null = null;

  const handler = (delta: DeltaEvent) => {
    if (isPrivateDiceRoll(delta, role)) return;
    queue.push(delta);
    const resolve = notify;
    notify = null;
    resolve?.();
  };

  const emitter = getTableEmitter(tableId);
  emitter.on("delta", handler);

  const disconnect = trackConnection(tableId, role);

  try {
    yield stateForRole(await getState(tableId), role);

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
