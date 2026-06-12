import { command } from "$app/server";
import { requireDm } from "$lib/server/auth.js";
import { dispatchTableEvent, getState } from "$lib/server/table-state.js";
import { randomUUID } from "node:crypto";
import * as v from "valibot";

function sortEntries(entries: InitiativeEntry[]): InitiativeEntry[] {
  return entries.toSorted((a, b) => {
    if (a.initiative === null) return b.initiative === null ? 0 : 1;
    if (b.initiative === null) return -1;
    return b.initiative - a.initiative;
  });
}

export const activateInitiative = command(v.string(), async (tableId) => {
  requireDm();
  const state = await getState(tableId);
  const entries: InitiativeEntry[] = state.tokens
    .filter((t) => t.owner !== undefined)
    .map((t) => ({ tokenId: t.id, name: t.name, initiative: null, isNPC: false }));
  await dispatchTableEvent(tableId, {
    type: "initiative:updated",
    tracker: { active: true, entries, turn: 0 },
  });
});

export const deactivateInitiative = command(v.string(), async (tableId) => {
  requireDm();
  await dispatchTableEvent(tableId, { type: "initiative:updated", tracker: null });
});

export const addNpcEntry = command(
  v.object({
    tableId: v.string(),
    name: v.pipe(v.string(), v.nonEmpty()),
    initiative: v.pipe(v.number(), v.finite()),
  }),
  async (arg) => {
    requireDm();
    const state = await getState(arg.tableId);
    if (!state.initiative) return;
    const entry: InitiativeEntry = {
      tokenId: `npc:${randomUUID()}`,
      name: arg.name,
      initiative: arg.initiative,
      isNPC: true,
    };
    await dispatchTableEvent(arg.tableId, {
      type: "initiative:updated",
      tracker: {
        ...state.initiative,
        entries: sortEntries([...state.initiative.entries, entry]),
      },
    });
  },
);

export const removeInitiativeEntry = command(
  v.object({ tableId: v.string(), tokenId: v.string() }),
  async (arg) => {
    requireDm();
    const state = await getState(arg.tableId);
    if (!state.initiative) return;
    await dispatchTableEvent(arg.tableId, {
      type: "initiative:updated",
      tracker: {
        ...state.initiative,
        entries: state.initiative.entries.filter((e) => e.tokenId !== arg.tokenId),
      },
    });
  },
);

export const adjustTurn = command(
  v.object({ tableId: v.string(), delta: v.pipe(v.number(), v.integer()) }),
  async (arg) => {
    requireDm();
    const state = await getState(arg.tableId);
    if (!state.initiative) return;
    await dispatchTableEvent(arg.tableId, {
      type: "initiative:updated",
      tracker: {
        ...state.initiative,
        turn: Math.max(0, state.initiative.turn + arg.delta),
      },
    });
  },
);
