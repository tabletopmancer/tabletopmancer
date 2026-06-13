import { TABLETOPMANCER_HOME } from "$env/static/private";
import { SCHEMA } from "$lib/server/schema.js";
import { tableDirName } from "$lib/server/table-dir.js";
import { DatabaseSync } from "node:sqlite";
import fs from "fs-extra";
import path from "node:path";

const savesDir = path.join(TABLETOPMANCER_HOME, "saves");
const dbCache = new Map<string, DatabaseSync>();

export function getDb(tableId: string): DatabaseSync {
  const cached = dbCache.get(tableId);
  if (cached) return cached;

  const dir = path.resolve(savesDir, tableDirName(tableId));
  fs.ensureDirSync(dir);

  const metaPath = path.join(dir, "meta.json");
  if (!fs.existsSync(metaPath)) {
    fs.writeJsonSync(metaPath, { id: tableId });
  }

  const db = new DatabaseSync(path.join(dir, "db.sqlite"));
  db.exec(SCHEMA);
  dbCache.set(tableId, db);
  return db;
}
