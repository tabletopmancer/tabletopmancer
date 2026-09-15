import { TABLETOPMANCER_HOME } from "$lib/server/config.js";
import { getDb } from "$lib/server/db.js";
import { tableDirName } from "$lib/server/table-dir.js";
import { DatabaseSync } from "node:sqlite";
import fs from "fs-extra";
import path from "node:path";
import { describe, expect, it } from "vitest";

const savesDir = path.join(TABLETOPMANCER_HOME, "saves");

function tableDir(tableId: string): string {
  return path.join(savesDir, tableDirName(tableId));
}

function columns(db: DatabaseSync, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map(
    (c) => c.name,
  );
}

describe("getDb", () => {
  it("creates the table directory with meta.json and a schema-applied database", () => {
    const tableId = "Fresh Campaign";
    const db = getDb(tableId);

    const dir = tableDir(tableId);
    expect(fs.readJsonSync(path.join(dir, "meta.json"))).toEqual({ id: tableId });
    expect(fs.existsSync(path.join(dir, "db.sqlite"))).toBe(true);

    const tables = (
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{
        name: string;
      }>
    ).map((r) => r.name);
    expect(tables).toEqual(
      expect.arrayContaining([
        "tokens",
        "maps",
        "fog_patches",
        "rolls",
        "initiative",
        "players",
        "board_meta",
        "sessions",
        "event_log",
      ]),
    );
  });

  it("keeps an existing meta.json untouched", () => {
    const tableId = "Existing Meta";
    const dir = tableDir(tableId);
    fs.ensureDirSync(dir);
    fs.writeJsonSync(path.join(dir, "meta.json"), { id: tableId, note: "hand written" });

    getDb(tableId);

    expect(fs.readJsonSync(path.join(dir, "meta.json"))).toEqual({
      id: tableId,
      note: "hand written",
    });
  });

  it("adds the color columns to a database saved before they shipped", () => {
    const tableId = "Legacy Save";
    const dir = tableDir(tableId);
    fs.ensureDirSync(dir);

    const legacy = new DatabaseSync(path.join(dir, "db.sqlite"));
    legacy.exec(`
      CREATE TABLE players (id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL);
      CREATE TABLE rolls (
        id TEXT PRIMARY KEY,
        player TEXT NOT NULL,
        formula TEXT NOT NULL,
        dice TEXT NOT NULL,
        modifier INTEGER NOT NULL,
        total INTEGER NOT NULL,
        private INTEGER NOT NULL,
        timestamp INTEGER NOT NULL
      );
    `);
    legacy
      .prepare("INSERT INTO players (id, name, status) VALUES (?, ?, ?)")
      .run("p1", "Alice", "approved");
    legacy.close();

    const db = getDb(tableId);

    expect(columns(db, "players")).toContain("color");
    expect(columns(db, "rolls")).toContain("color");
    expect(db.prepare("SELECT * FROM players").all()).toEqual([
      { id: "p1", name: "Alice", status: "approved", color: null },
    ]);
  });
});
