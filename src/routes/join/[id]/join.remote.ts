import { query } from "$app/server";
import { getTableEmitter, isDmConnected } from "$lib/server/table-state.js";

type PlayerStatusEvent =
  | { type: "dm:online" }
  | { type: "dm:offline" }
  | { type: "player:approved" }
  | { type: "player:denied" }
  | { type: "player:revoked" };

type PlayerDelta = Extract<
  DeltaEvent,
  { type: "player:approved" | "player:denied" | "player:revoked" }
>;

function isPlayerDelta(delta: DeltaEvent): delta is PlayerDelta {
  return (
    delta.type === "player:approved" ||
    delta.type === "player:denied" ||
    delta.type === "player:revoked"
  );
}

function enqueueInitialStatus(queue: PlayerStatusEvent[], tableId: string): void {
  queue.push({ type: isDmConnected(tableId) ? "dm:online" : "dm:offline" });
}

export const playerStatus = query.live(
  "unchecked",
  async function* (arg: string): AsyncGenerator<PlayerStatusEvent> {
    const sep = arg.lastIndexOf("|");
    const tableId = arg.slice(0, sep);
    const playerId = arg.slice(sep + 1);

    const queue: PlayerStatusEvent[] = [];
    let notify: (() => void) | null = null;

    const wake = () => {
      const resolve = notify;
      notify = null;
      resolve?.();
    };

    const deltaHandler = (delta: DeltaEvent) => {
      if (!isPlayerDelta(delta)) return;
      if (delta.playerId !== playerId) return;
      queue.push({ type: delta.type });
      wake();
    };

    const dmOnlineHandler = () => {
      queue.push({ type: "dm:online" });
      wake();
    };

    const dmOfflineHandler = () => {
      queue.push({ type: "dm:offline" });
      wake();
    };

    const emitter = getTableEmitter(tableId);
    emitter.on("delta", deltaHandler);
    emitter.on("dm-online", dmOnlineHandler);
    emitter.on("dm-offline", dmOfflineHandler);

    enqueueInitialStatus(queue, tableId);

    try {
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
      emitter.off("delta", deltaHandler);
      emitter.off("dm-online", dmOnlineHandler);
      emitter.off("dm-offline", dmOfflineHandler);
    }
  },
);
