import { applyTableEvent } from "$lib/apply-table-event.js";
import { TABLETOPMANCER_HOME } from "$env/static/private";
import fs from "fs-extra";
import { EventEmitter } from "node:events";
import path from "node:path";

export { applyTableEvent };

const savesDir = path.join(TABLETOPMANCER_HOME, "saves");

const stateCache = new Map<string, BoardState>();
const emitters = new Map<string, EventEmitter>();
const dmConnections = new Map<string, number>();

function emptyState(): BoardState {
  return {
    tokens: [],
    maps: [],
    initiative: null,
    rollHistory: [],
    players: [],
    paused: false,
  };
}

export function getTableEmitter(tableId: string): EventEmitter {
  let emitter = emitters.get(tableId);
  if (!emitter) {
    emitter = new EventEmitter();
    emitter.setMaxListeners(0);
    emitters.set(tableId, emitter);
  }
  return emitter;
}

async function loadState(tableId: string): Promise<BoardState> {
  const cached = stateCache.get(tableId);
  if (cached) return cached;

  const statePath = path.join(savesDir, tableId, "state.json");

  try {
    const state = (await fs.readJSON(statePath)) as BoardState;
    stateCache.set(tableId, state);
    return state;
  } catch {
    const state = emptyState();
    stateCache.set(tableId, state);
    return state;
  }
}

async function persistState(tableId: string): Promise<void> {
  const state = stateCache.get(tableId);
  if (!state) return;
  const statePath = path.join(savesDir, tableId, "state.json");
  await fs.ensureDir(path.dirname(statePath));
  await fs.writeJSON(statePath, state, { spaces: 2 });
}

export async function getState(tableId: string): Promise<BoardState> {
  return loadState(tableId);
}

export function isDmConnected(tableId: string): boolean {
  return (dmConnections.get(tableId) ?? 0) > 0;
}

export function trackConnection(tableId: string, role: string): () => void {
  if (role !== "DM") return () => {};
  return trackDmConnection(tableId);
}

export function trackDmConnection(tableId: string): () => void {
  const emitter = getTableEmitter(tableId);
  const prev = dmConnections.get(tableId) ?? 0;
  dmConnections.set(tableId, prev + 1);
  if (prev === 0) emitter.emit("dm-online");
  return () => {
    const count = (dmConnections.get(tableId) ?? 1) - 1;
    if (count <= 0) {
      dmConnections.delete(tableId);
      emitter.emit("dm-offline");
    } else {
      dmConnections.set(tableId, count);
    }
  };
}

export async function dispatchTableEvent(tableId: string, event: TableEvent): Promise<void> {
  const state = await loadState(tableId);
  applyTableEvent(state, event);
  await persistState(tableId);
  getTableEmitter(tableId).emit("table-event", event);
}
