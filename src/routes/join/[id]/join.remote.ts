import { query } from "$app/server";
import { requireSessionPlayerId } from "$lib/server/auth.js";
import { getTableEmitter, isDmConnected } from "$lib/server/table-state.js";
import * as v from "valibot";

type PlayerStatusEvent =
  | { type: "dm:online" }
  | { type: "dm:offline" }
  | { type: "player:approved" }
  | { type: "player:denied" }
  | { type: "player:revoked" };

type PlayerTableEvent = Extract<
  TableEvent,
  { type: "player:approved" | "player:denied" | "player:revoked" }
>;

function isPlayerTableEvent(event: TableEvent): event is PlayerTableEvent {
  return (
    event.type === "player:approved" ||
    event.type === "player:denied" ||
    event.type === "player:revoked"
  );
}

function enqueueInitialStatus(queue: PlayerStatusEvent[], tableId: string): void {
  queue.push({ type: isDmConnected(tableId) ? "dm:online" : "dm:offline" });
}

export const playerStatus = query.live(
  v.string(),
  async function* (tableId): AsyncGenerator<PlayerStatusEvent> {
    const playerId = await requireSessionPlayerId(tableId);

    const queue: PlayerStatusEvent[] = [];
    let notify: (() => void) | null = null;

    const wake = () => {
      const resolve = notify;
      notify = null;
      resolve?.();
    };

    const eventHandler = (event: TableEvent) => {
      if (!isPlayerTableEvent(event)) return;
      if (event.playerId !== playerId) return;
      queue.push({ type: event.type });
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
    emitter.on("table-event", eventHandler);
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
      emitter.off("table-event", eventHandler);
      emitter.off("dm-online", dmOnlineHandler);
      emitter.off("dm-offline", dmOfflineHandler);
    }
  },
);
