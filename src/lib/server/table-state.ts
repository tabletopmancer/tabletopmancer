import { applyDelta } from "$lib/apply-delta.js";
import { TABLETOPMANCER_HOME } from "$env/static/private";
import fs from "fs-extra";
import { EventEmitter } from "node:events";
import path from "node:path";

export { applyDelta };

const savesDir = path.join(TABLETOPMANCER_HOME, "saves");

const stateCache = new Map<string, BoardState>();
const emitters = new Map<string, EventEmitter>();

function emptyState(): BoardState {
  return {
    tokens: [],
    maps: [],
    initiative: null,
    rollHistory: [],
    players: [],
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

export async function dispatchDelta(tableId: string, delta: DeltaEvent): Promise<void> {
  const state = await loadState(tableId);
  applyDelta(state, delta);
  await persistState(tableId);
  getTableEmitter(tableId).emit("delta", delta);
}
