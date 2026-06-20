import { type DatabaseSync } from "node:sqlite";

type Persister<T extends TableEvent["type"]> = (
  db: DatabaseSync,
  event: Extract<TableEvent, { type: T }>,
) => void;

const persisters = {
  "token:placed": (db, event) => {
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
  },
  "token:moved": (db, event) =>
    db
      .prepare("UPDATE tokens SET x = ?, y = ? WHERE id = ?")
      .run(event.position.x, event.position.y, event.id),
  "token:removed": (db, event) => db.prepare("DELETE FROM tokens WHERE id = ?").run(event.id),
  "token:owner-assigned": (db, event) =>
    db.prepare("UPDATE tokens SET owner = ? WHERE id = ?").run(event.owner ?? null, event.id),
  "map:placed": (db, event) => {
    const m = event.map;
    db.exec("BEGIN");
    try {
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
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  },
  "map:removed": (db, event) => db.prepare("DELETE FROM maps WHERE id = ?").run(event.id),
  "map:moved": (db, event) =>
    db
      .prepare("UPDATE maps SET x = ?, y = ? WHERE id = ?")
      .run(event.position.x, event.position.y, event.id),
  "fog:updated": (db, event) => {
    const p = event.patch;
    db.prepare("INSERT INTO fog_patches (map_id, mode, x, y, radius) VALUES (?, ?, ?, ?, ?)").run(
      event.mapId,
      p.mode,
      p.x,
      p.y,
      p.radius,
    );
  },
  "dice:rolled": (db, event) => {
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
  },
  "initiative:updated": (db, event) => {
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
  },
  "player:joined": (db, event) =>
    db
      .prepare("INSERT OR IGNORE INTO players (id, name, status) VALUES (?, ?, ?)")
      .run(event.player.id, event.player.name, event.player.status),
  "player:approved": (db, event) =>
    db.prepare("UPDATE players SET status = 'approved' WHERE id = ?").run(event.playerId),
  "player:denied": (db, event) =>
    db.prepare("UPDATE players SET status = 'denied' WHERE id = ?").run(event.playerId),
  "player:revoked": (db, event) =>
    db.prepare("UPDATE players SET status = 'revoked' WHERE id = ?").run(event.playerId),
  "board:paused": (db) =>
    db.prepare("INSERT OR REPLACE INTO board_meta (key, value) VALUES ('paused', 'true')").run(),
  "board:unpaused": (db) =>
    db.prepare("INSERT OR REPLACE INTO board_meta (key, value) VALUES ('paused', 'false')").run(),
  "board:opened": (db) =>
    db.prepare("INSERT OR REPLACE INTO board_meta (key, value) VALUES ('open', 'true')").run(),
  "board:closed": (db) =>
    db.prepare("INSERT OR REPLACE INTO board_meta (key, value) VALUES ('open', 'false')").run(),
  ping: () => {},
} satisfies { [K in TableEvent["type"]]: Persister<K> };

const LOGGED_EVENT_TYPES = new Set([
  "token:placed",
  "token:removed",
  "token:owner-assigned",
  "map:placed",
  "map:removed",
  "dice:rolled",
  "initiative:updated",
  "player:joined",
  "player:approved",
  "player:denied",
  "player:revoked",
  "board:paused",
  "board:unpaused",
  "board:opened",
  "board:closed",
]);

export function persistTableEvent(db: DatabaseSync, event: TableEvent): void {
  (persisters[event.type] as Persister<typeof event.type>)(db, event);
  if (LOGGED_EVENT_TYPES.has(event.type)) {
    db.prepare("INSERT INTO event_log (type, payload, timestamp) VALUES (?, ?, ?)").run(
      event.type,
      JSON.stringify(event),
      Date.now(),
    );
  }
}
