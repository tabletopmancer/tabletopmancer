import { command } from "$app/server";
import { dispatchDelta, getState } from "$lib/server/table-state.js";
import { randomUUID } from "node:crypto";

function sortEntries(entries: InitiativeEntry[]): InitiativeEntry[] {
  return [...entries].sort((a, b) => {
    if (a.initiative === null && b.initiative === null) return 0;
    if (a.initiative === null) return 1;
    if (b.initiative === null) return -1;
    return b.initiative - a.initiative;
  });
}

export const activateInitiative = command("unchecked", async (tableId: string) => {
  const state = await getState(tableId);
  const entries: InitiativeEntry[] = state.tokens
    .filter((t) => t.owner !== undefined)
    .map((t) => ({ tokenId: t.id, name: t.name, initiative: null, isNPC: false }));
  await dispatchDelta(tableId, {
    type: "initiative:updated",
    tracker: { active: true, entries, turn: 0 },
  });
});

export const deactivateInitiative = command("unchecked", async (tableId: string) => {
  await dispatchDelta(tableId, { type: "initiative:updated", tracker: null });
});

export const addNpcEntry = command(
  "unchecked",
  async (arg: { tableId: string; name: string; initiative: number }) => {
    const state = await getState(arg.tableId);
    if (!state.initiative) return;
    const entry: InitiativeEntry = {
      tokenId: `npc:${randomUUID()}`,
      name: arg.name,
      initiative: arg.initiative,
      isNPC: true,
    };
    await dispatchDelta(arg.tableId, {
      type: "initiative:updated",
      tracker: {
        ...state.initiative,
        entries: sortEntries([...state.initiative.entries, entry]),
      },
    });
  },
);

export const removeInitiativeEntry = command(
  "unchecked",
  async (arg: { tableId: string; tokenId: string }) => {
    const state = await getState(arg.tableId);
    if (!state.initiative) return;
    await dispatchDelta(arg.tableId, {
      type: "initiative:updated",
      tracker: {
        ...state.initiative,
        entries: state.initiative.entries.filter((e) => e.tokenId !== arg.tokenId),
      },
    });
  },
);

export const adjustTurn = command("unchecked", async (arg: { tableId: string; delta: number }) => {
  const state = await getState(arg.tableId);
  if (!state.initiative) return;
  await dispatchDelta(arg.tableId, {
    type: "initiative:updated",
    tracker: {
      ...state.initiative,
      turn: Math.max(0, state.initiative.turn + arg.delta),
    },
  });
});
