import { applyTableEvent } from "$lib/apply-table-event.js";
import { getDb } from "$lib/server/db.js";
import { EventEmitter } from "node:events";

export { applyTableEvent };

const stateCache = new Map<string, BoardState>();
const emitters = new Map<string, EventEmitter>();
const dmConnections = new Map<string, number>();

export function getTableEmitter(tableId: string): EventEmitter {
  let emitter = emitters.get(tableId);
  if (!emitter) {
    emitter = new EventEmitter();
    emitter.setMaxListeners(0);
    emitters.set(tableId, emitter);
  }
  return emitter;
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
    status: r.status as Player["status"],
  }));

  const pausedRow = db.prepare("SELECT value FROM board_meta WHERE key = 'paused'").get() as any;
  const paused = pausedRow?.value === "true";

  return { tokens, maps, initiative, rollHistory, players, paused };
}

function persistEvent(tableId: string, event: TableEvent): void {
  const db = getDb(tableId);

  switch (event.type) {
    case "token:placed": {
      const t = event.token;
      db.prepare(
        "INSERT OR REPLACE INTO tokens (id, name, x, y, image_url, owner, size) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).run(
        t.id,
        t.name,
        t.position.x,
        t.position.y,
        t.imageUrl ?? null,
        t.owner ?? null,
        t.size ?? null,
      );
      break;
    }
    case "token:moved":
      db.prepare("UPDATE tokens SET x = ?, y = ? WHERE id = ?").run(
        event.position.x,
        event.position.y,
        event.id,
      );
      break;
    case "token:removed":
      db.prepare("DELETE FROM tokens WHERE id = ?").run(event.id);
      break;
    case "token:owner-assigned":
      db.prepare("UPDATE tokens SET owner = ? WHERE id = ?").run(event.owner ?? null, event.id);
      break;
    case "map:placed": {
      const m = event.map;
      db.prepare("INSERT OR REPLACE INTO maps (id, asset_url, x, y) VALUES (?, ?, ?, ?)").run(
        m.id,
        m.assetUrl,
        m.position.x,
        m.position.y,
      );
      if (m.fog?.length) {
        const ins = db.prepare(
          "INSERT INTO fog_patches (map_id, mode, x, y, radius) VALUES (?, ?, ?, ?, ?)",
        );
        for (const p of m.fog) ins.run(m.id, p.mode, p.x, p.y, p.radius);
      }
      break;
    }
    case "map:removed":
      db.prepare("DELETE FROM maps WHERE id = ?").run(event.id);
      break;
    case "map:moved":
      db.prepare("UPDATE maps SET x = ?, y = ? WHERE id = ?").run(
        event.position.x,
        event.position.y,
        event.id,
      );
      break;
    case "fog:updated": {
      const p = event.patch;
      db.prepare("INSERT INTO fog_patches (map_id, mode, x, y, radius) VALUES (?, ?, ?, ?, ?)").run(
        event.mapId,
        p.mode,
        p.x,
        p.y,
        p.radius,
      );
      break;
    }
    case "dice:rolled": {
      const r = event.roll;
      db.prepare(
        "INSERT OR REPLACE INTO rolls (id, player, formula, dice, modifier, total, private, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ).run(
        r.id,
        r.player,
        r.formula,
        JSON.stringify(r.dice),
        r.modifier,
        r.total,
        r.private ? 1 : 0,
        r.timestamp,
      );
      break;
    }
    case "initiative:updated":
      if (event.tracker) {
        db.prepare(
          "INSERT OR REPLACE INTO initiative (id, active, entries, turn) VALUES (1, ?, ?, ?)",
        ).run(
          event.tracker.active ? 1 : 0,
          JSON.stringify(event.tracker.entries),
          event.tracker.turn,
        );
      } else {
        db.prepare("DELETE FROM initiative WHERE id = 1").run();
      }
      break;
    case "player:joined":
      db.prepare("INSERT OR IGNORE INTO players (id, name, status) VALUES (?, ?, ?)").run(
        event.player.id,
        event.player.name,
        event.player.status,
      );
      break;
    case "player:approved":
      db.prepare("UPDATE players SET status = 'approved' WHERE id = ?").run(event.playerId);
      break;
    case "player:denied":
      db.prepare("UPDATE players SET status = 'denied' WHERE id = ?").run(event.playerId);
      break;
    case "player:revoked":
      db.prepare("UPDATE players SET status = 'revoked' WHERE id = ?").run(event.playerId);
      break;
    case "board:paused":
      db.prepare("INSERT OR REPLACE INTO board_meta (key, value) VALUES ('paused', 'true')").run();
      break;
    case "board:unpaused":
      db.prepare("INSERT OR REPLACE INTO board_meta (key, value) VALUES ('paused', 'false')").run();
      break;
    case "ping":
      break;
  }
}

function loadState(tableId: string): BoardState {
  const cached = stateCache.get(tableId);
  if (cached) return cached;
  const state = loadStateFromDb(tableId);
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
  const state = loadState(tableId);
  applyTableEvent(state, event);
  persistEvent(tableId, event);
  getTableEmitter(tableId).emit("table-event", event);
}
