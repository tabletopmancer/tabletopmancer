import { TABLETOPMANCER_HOME } from "$lib/server/config.js";
import { SCHEMA } from "$lib/server/schema.js";
import { tableDirName } from "$lib/server/table-dir.js";
import { DatabaseSync } from "node:sqlite";
import fs from "fs-extra";
import path from "node:path";

const savesDir = path.join(TABLETOPMANCER_HOME, "saves");
const dbCache = new Map<string, DatabaseSync>();
const MAX_CACHED_DBS = 100;

function hasColumn(db: DatabaseSync, table: string, column: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return cols.some((c) => c.name === column);
}

/** Add columns introduced after a table's original `CREATE TABLE` shipped. */
function migrate(db: DatabaseSync): void {
  if (!hasColumn(db, "players", "color")) {
    db.exec("ALTER TABLE players ADD COLUMN color TEXT");
  }
  if (!hasColumn(db, "rolls", "color")) {
    db.exec("ALTER TABLE rolls ADD COLUMN color TEXT");
  }
}

export function getDb(tableId: string): DatabaseSync {
  const cached = dbCache.get(tableId);
  if (cached) {
    dbCache.delete(tableId);
    dbCache.set(tableId, cached);
    return cached;
  }

  const dir = path.resolve(savesDir, tableDirName(tableId));
  fs.ensureDirSync(dir);

  const metaPath = path.join(dir, "meta.json");
  if (!fs.existsSync(metaPath)) {
    fs.writeJsonSync(metaPath, { id: tableId });
  }

  const db = new DatabaseSync(path.join(dir, "db.sqlite"));
  db.exec(SCHEMA);
  migrate(db);

  if (dbCache.size >= MAX_CACHED_DBS) {
    const oldest = dbCache.keys().next().value!;
    dbCache.get(oldest)!.close();
    dbCache.delete(oldest);
  }

  dbCache.set(tableId, db);
  return db;
}
