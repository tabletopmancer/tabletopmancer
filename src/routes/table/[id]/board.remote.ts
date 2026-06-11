import { getRequestEvent, query } from "$app/server";
import { requireParticipant } from "$lib/server/auth.js";
import { getState, getTableEmitter, trackConnection } from "$lib/server/table-state.js";

function isPrivateDiceRoll(event: TableEvent, role: string): boolean {
  return event.type === "dice:rolled" && event.roll.private && role !== "DM";
}

function filterInitiative(initiative: InitiativeTracker | null): InitiativeTracker | null {
  if (!initiative) return null;
  return { ...initiative, entries: initiative.entries.filter((e) => !e.isNPC) };
}

function stateForRole(state: BoardState, role: string): BoardState {
  if (role === "DM") return state;
  return {
    ...state,
    rollHistory: state.rollHistory.filter((r) => !r.private),
    initiative: filterInitiative(state.initiative),
  };
}

function filterEventForPlayer(event: TableEvent, role: string): TableEvent | null {
  if (isPrivateDiceRoll(event, role)) return null;
  if (event.type === "initiative:updated" && event.tracker) {
    return { ...event, tracker: filterInitiative(event.tracker) };
  }
  return event;
}

function eventForRole(event: TableEvent, role: string): TableEvent | null {
  return role === "DM" ? event : filterEventForPlayer(event, role);
}

export const boardLive = query.live("unchecked", async function* (tableId: string): AsyncGenerator<
  BoardState | TableEvent
> {
  const { locals } = getRequestEvent();
  const role = locals.role;
  await requireParticipant(tableId);

  const queue: TableEvent[] = [];
  let notify: (() => void) | null = null;

  const handler = (event: TableEvent) => {
    const filtered = eventForRole(event, role);
    if (!filtered) return;
    queue.push(filtered);
    const resolve = notify;
    notify = null;
    resolve?.();
  };

  const emitter = getTableEmitter(tableId);
  emitter.on("table-event", handler);

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
    emitter.off("table-event", handler);
    disconnect();
  }
});
