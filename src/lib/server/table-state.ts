import { TABLETOPMANCER_HOME } from "$env/static/private";
import fs from "fs-extra";
import { EventEmitter } from "node:events";
import path from "node:path";

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

export async function applyDelta(tableId: string, delta: DeltaEvent): Promise<void> {
  const state = await loadState(tableId);
  mutateBoardState(state, delta);
  await persistState(tableId);
  getTableEmitter(tableId).emit("delta", delta);
}

function mutateBoardState(state: BoardState, delta: DeltaEvent): void {
  switch (delta.type) {
    case "token:placed":
      state.tokens.push(delta.token);
      break;
    case "token:moved": {
      const t = state.tokens.find((t) => t.id === delta.id);
      if (t) t.position = delta.position;
      break;
    }
    case "token:removed":
      state.tokens = state.tokens.filter((t) => t.id !== delta.id);
      break;
    case "token:owner-assigned": {
      const t = state.tokens.find((t) => t.id === delta.id);
      if (t) t.owner = delta.owner;
      break;
    }
    case "map:placed":
      state.maps.push(delta.map);
      break;
    case "map:removed":
      state.maps = state.maps.filter((m) => m.id !== delta.id);
      break;
    case "fog:updated": {
      const m = state.maps.find((m) => m.id === delta.mapId);
      if (m) {
        m.fog ??= {};
        for (const cell of delta.patch.cells) {
          m.fog[`${cell.x},${cell.y}`] = cell.visible;
        }
      }
      break;
    }
    case "dice:rolled":
      state.rollHistory.push(delta.roll);
      break;
    case "ping":
      // transient — not persisted
      break;
    case "initiative:updated":
      state.initiative = delta.tracker;
      break;
    case "player:joined":
      if (!state.players.find((p) => p.id === delta.player.id)) {
        state.players.push(delta.player);
      }
      break;
    case "player:approved": {
      const idx = state.players.findIndex((p) => p.id === delta.player.id);
      if (idx >= 0) state.players[idx] = delta.player;
      else state.players.push(delta.player);
      break;
    }
    case "player:revoked":
      state.players = state.players.filter((p) => p.id !== delta.playerId);
      break;
  }
}
