import { applyTableEvent } from "$lib/apply-table-event.js";
import { getDb } from "$lib/server/db.js";
import { persistTableEvent } from "$lib/server/persist-table-event.js";
import { EventEmitter } from "node:events";

export { applyTableEvent };

const stateCache = new Map<string, BoardState>();
const emitters = new Map<string, EventEmitter>();
const dmConnections = new Map<string, number>();

const MAX_CACHED_TABLES = 100;

function isEmitterIdle(emitter: EventEmitter): boolean {
  return (
    emitter.listenerCount("table-event") === 0 &&
    emitter.listenerCount("dm-online") === 0 &&
    emitter.listenerCount("dm-offline") === 0
  );
}

function evictIdleEmitter(): void {
  for (const [id, e] of emitters) {
    if (isEmitterIdle(e)) {
      emitters.delete(id);
      dmConnections.delete(id);
      return;
    }
  }
}

export function getTableEmitter(tableId: string): EventEmitter {
  let emitter = emitters.get(tableId);
  if (!emitter) {
    if (emitters.size >= MAX_CACHED_TABLES) evictIdleEmitter();
    emitter = new EventEmitter();
    emitter.setMaxListeners(0);
    emitters.set(tableId, emitter);
  }
  return emitter;
}

function loadAudioState(db: ReturnType<typeof getDb>): AudioState | null {
  const row = db.prepare("SELECT value FROM board_meta WHERE key = 'audio'").get() as any;
  return row ? (JSON.parse(row.value as string) as AudioState) : null;
}

function loadStateFromDb(tableId: string): BoardState {
  const db = getDb(tableId);

  const tokenRows = db.prepare("SELECT * FROM tokens").all() as any[];
  const tokens: Token[] = tokenRows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    position: { x: r.x as number, y: r.y as number },
    ...(r.image_url != null ? { imageUrl: r.image_url as string } : {}),
    ...(r.owner != null ? { owner: r.owner as string } : {}),
    ...(r.size != null ? { size: r.size as number } : {}),
  }));

  const mapRows = db.prepare("SELECT * FROM maps").all() as any[];
  const fogRows = db.prepare("SELECT * FROM fog_patches ORDER BY id").all() as any[];
  const maps: BoardMap[] = mapRows.map((r) => ({
    id: r.id as string,
    assetUrl: r.asset_url as string,
    position: { x: r.x as number, y: r.y as number },
    fog: (fogRows as any[])
      .filter((f) => f.map_id === r.id)
      .map((f) => ({
        mode: f.mode as "reveal" | "hide",
        x: f.x as number,
        y: f.y as number,
        radius: f.radius as number,
      })),
  }));

  const rollRows = db.prepare("SELECT * FROM rolls ORDER BY timestamp").all() as any[];
  const rollHistory: DiceRoll[] = rollRows.map((r) => ({
    id: r.id as string,
    player: r.player as string,
    ...(r.color != null ? { color: r.color as string } : {}),
    formula: r.formula as string,
    dice: JSON.parse(r.dice as string) as number[],
    modifier: r.modifier as number,
    total: r.total as number,
    private: Boolean(r.private),
    timestamp: r.timestamp as number,
  }));

  const initRow = db.prepare("SELECT * FROM initiative WHERE id = 1").get() as any;
  const initiative: InitiativeTracker | null = initRow
    ? {
        active: Boolean(initRow.active),
        entries: JSON.parse(initRow.entries as string) as InitiativeEntry[],
        turn: initRow.turn as number,
      }
    : null;

  const playerRows = db.prepare("SELECT * FROM players").all() as any[];
  const players: Player[] = playerRows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    ...(r.color != null ? { color: r.color as string } : {}),
    status: r.status as Player["status"],
  }));

  const pausedRow = db.prepare("SELECT value FROM board_meta WHERE key = 'paused'").get() as any;
  const paused = pausedRow?.value === "true";

  const openRow = db.prepare("SELECT value FROM board_meta WHERE key = 'open'").get() as any;
  const open = openRow?.value === "true";

  const audio = loadAudioState(db);

  return { tokens, maps, initiative, rollHistory, players, paused, open, audio };
}

function loadState(tableId: string): BoardState {
  const cached = stateCache.get(tableId);
  if (cached) {
    stateCache.delete(tableId);
    stateCache.set(tableId, cached);
    return cached;
  }
  const state = loadStateFromDb(tableId);
  if (stateCache.size >= MAX_CACHED_TABLES) {
    stateCache.delete(stateCache.keys().next().value!);
  }
  stateCache.set(tableId, state);
  return state;
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
  persistTableEvent(getDb(tableId), event);
  const state = loadState(tableId);
  applyTableEvent(state, event);
  getTableEmitter(tableId).emit("table-event", event);
}
