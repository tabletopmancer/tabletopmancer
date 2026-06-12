import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import { persistTableEvent } from "./persist-table-event.js";
import { SCHEMA } from "./schema.js";

let db: DatabaseSync;

beforeEach(() => {
  db = new DatabaseSync(":memory:");
  db.exec(SCHEMA);
});

function rows(table: string): any[] {
  return db.prepare(`SELECT * FROM ${table}`).all() as any[];
}

const token: Token = {
  id: "t1",
  name: "Hero",
  position: { x: 1.5, y: -2 },
  imageUrl: "/hero.png",
  owner: "p1",
  size: 2,
};

const map: BoardMap = {
  id: "m1",
  assetUrl: "/map.uvtt",
  position: { x: 10, y: 20 },
  fog: [{ mode: "reveal", x: 1, y: 2, radius: 50 }],
};

describe("token persisters", () => {
  it("persists a placed token with all fields", () => {
    persistTableEvent(db, { type: "token:placed", token });
    expect(rows("tokens")).toEqual([
      { id: "t1", name: "Hero", x: 1.5, y: -2, image_url: "/hero.png", owner: "p1", size: 2 },
    ]);
  });

  it("persists optional fields as null", () => {
    persistTableEvent(db, {
      type: "token:placed",
      token: { id: "t2", name: "Mook", position: { x: 0, y: 0 } },
    });
    expect(rows("tokens")[0]).toMatchObject({ image_url: null, owner: null, size: null });
  });

  it("updates the position on move", () => {
    persistTableEvent(db, { type: "token:placed", token });
    persistTableEvent(db, { type: "token:moved", id: "t1", position: { x: 9, y: 9 } });
    expect(rows("tokens")[0]).toMatchObject({ x: 9, y: 9 });
  });

  it("deletes a removed token", () => {
    persistTableEvent(db, { type: "token:placed", token });
    persistTableEvent(db, { type: "token:removed", id: "t1" });
    expect(rows("tokens")).toEqual([]);
  });

  it("assigns and clears the owner", () => {
    persistTableEvent(db, { type: "token:placed", token });
    persistTableEvent(db, { type: "token:owner-assigned", id: "t1", owner: "p2" });
    expect(rows("tokens")[0].owner).toBe("p2");
    persistTableEvent(db, { type: "token:owner-assigned", id: "t1", owner: undefined });
    expect(rows("tokens")[0].owner).toBeNull();
  });
});

describe("map and fog persisters", () => {
  it("persists a placed map with its fog patches", () => {
    persistTableEvent(db, { type: "map:placed", map });
    expect(rows("maps")).toEqual([{ id: "m1", asset_url: "/map.uvtt", x: 10, y: 20 }]);
    expect(rows("fog_patches")).toMatchObject([
      { map_id: "m1", mode: "reveal", x: 1, y: 2, radius: 50 },
    ]);
  });

  it("updates the position on move", () => {
    persistTableEvent(db, { type: "map:placed", map });
    persistTableEvent(db, { type: "map:moved", id: "m1", position: { x: -1, y: -2 } });
    expect(rows("maps")[0]).toMatchObject({ x: -1, y: -2 });
  });

  it("appends fog patches", () => {
    persistTableEvent(db, { type: "map:placed", map });
    persistTableEvent(db, {
      type: "fog:updated",
      mapId: "m1",
      patch: { mode: "hide", x: 3, y: 4, radius: 25 },
    });
    expect(rows("fog_patches")).toHaveLength(2);
    expect(rows("fog_patches")[1]).toMatchObject({ mode: "hide", x: 3, y: 4, radius: 25 });
  });

  it("cascades fog patch deletion when the map is removed", () => {
    persistTableEvent(db, { type: "map:placed", map });
    persistTableEvent(db, { type: "map:removed", id: "m1" });
    expect(rows("maps")).toEqual([]);
    expect(rows("fog_patches")).toEqual([]);
  });
});

describe("dice persister", () => {
  it("persists rolls with serialized dice", () => {
    const roll: DiceRoll = {
      id: "r1",
      player: "Alice",
      formula: "2d6+1",
      dice: [3, 5],
      modifier: 1,
      total: 9,
      private: true,
      timestamp: 123,
    };
    persistTableEvent(db, { type: "dice:rolled", roll });
    expect(rows("rolls")).toEqual([
      {
        id: "r1",
        player: "Alice",
        formula: "2d6+1",
        dice: "[3,5]",
        modifier: 1,
        total: 9,
        private: 1,
        timestamp: 123,
      },
    ]);
  });
});

describe("initiative persister", () => {
  const tracker: InitiativeTracker = {
    active: true,
    entries: [{ tokenId: "t1", name: "Hero", initiative: 15, isNPC: false }],
    turn: 2,
  };

  it("upserts the tracker", () => {
    persistTableEvent(db, { type: "initiative:updated", tracker });
    persistTableEvent(db, { type: "initiative:updated", tracker: { ...tracker, turn: 3 } });
    const row = rows("initiative")[0];
    expect(row).toMatchObject({ id: 1, active: 1, turn: 3 });
    expect(JSON.parse(row.entries)).toEqual(tracker.entries);
  });

  it("deletes the tracker when null", () => {
    persistTableEvent(db, { type: "initiative:updated", tracker });
    persistTableEvent(db, { type: "initiative:updated", tracker: null });
    expect(rows("initiative")).toEqual([]);
  });
});

describe("player persisters", () => {
  const player: Player = { id: "p1", name: "Alice", status: "pending" };

  it("inserts a joining player and ignores duplicates", () => {
    persistTableEvent(db, { type: "player:joined", player });
    persistTableEvent(db, { type: "player:joined", player: { ...player, name: "Imposter" } });
    expect(rows("players")).toEqual([{ id: "p1", name: "Alice", status: "pending" }]);
  });

  it.each([
    ["player:approved", "approved"],
    ["player:denied", "denied"],
    ["player:revoked", "revoked"],
  ] as const)("%s updates the status", (type, status) => {
    persistTableEvent(db, { type: "player:joined", player });
    persistTableEvent(db, { type, playerId: "p1" });
    expect(rows("players")[0].status).toBe(status);
  });
});

describe("board persisters", () => {
  it("stores the paused flag", () => {
    persistTableEvent(db, { type: "board:paused" });
    expect(rows("board_meta")).toEqual([{ key: "paused", value: "true" }]);
    persistTableEvent(db, { type: "board:unpaused" });
    expect(rows("board_meta")).toEqual([{ key: "paused", value: "false" }]);
  });

  it("does not persist pings", () => {
    persistTableEvent(db, { type: "ping", position: { x: 0, y: 0 }, player: "Alice" });
    for (const table of ["tokens", "maps", "rolls", "players", "board_meta"]) {
      expect(rows(table)).toEqual([]);
    }
  });
});
