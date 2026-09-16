import { describe, expect, it, vi } from "vitest";

/**
 * A module registry reset gives a table-state instance with empty caches, so
 * the state it returns comes from the database file rather than memory.
 */
async function freshTableState(): Promise<typeof import("$lib/server/table-state.js")> {
  vi.resetModules();
  return import("$lib/server/table-state.js");
}

const token: Token = {
  id: "tok-1",
  name: "Hero",
  position: { x: 3, y: -4 },
  imageUrl: "/hero.png",
  owner: "p1",
  size: 2,
};

const map: BoardMap = {
  id: "map-1",
  assetUrl: "/dungeon.uvtt",
  position: { x: 0, y: 0 },
  fog: [],
};

const roll: DiceRoll = {
  id: "roll-1",
  player: "Alice",
  color: "#ff0000",
  formula: "2d6+1",
  dice: [3, 5],
  modifier: 1,
  total: 9,
  private: false,
  timestamp: 1_700_000_000,
};

const player: Player = { id: "p1", name: "Alice", color: "#ff0000", status: "pending" };

const events: TableEvent[] = [
  { type: "board:opened" },
  { type: "player:joined", player },
  { type: "player:approved", playerId: player.id },
  { type: "map:placed", map },
  { type: "fog:updated", mapId: map.id, patch: { mode: "reveal", x: 1, y: 2, radius: 5 } },
  { type: "token:placed", token },
  { type: "token:moved", id: token.id, position: { x: 10, y: 11 } },
  { type: "dice:rolled", roll },
  {
    type: "initiative:updated",
    tracker: {
      active: true,
      turn: 1,
      entries: [{ tokenId: token.id, name: "Hero", initiative: 17, isNPC: false }],
    },
  },
  { type: "audio:played", url: "/tavern.mp3", name: "Tavern" },
  { type: "board:paused" },
];

describe("dispatchTableEvent", () => {
  it("writes a state that reloads from disk identical to the in-memory one", async () => {
    const tableId = "Round Trip";
    const live = await freshTableState();
    for (const event of events) await live.dispatchTableEvent(tableId, event);

    const inMemory = await live.getState(tableId);
    const reloaded = await (await freshTableState()).getState(tableId);

    expect(reloaded).toEqual(inMemory);
  });

  it("reloads removals and status changes from disk", async () => {
    const tableId = "Round Trip Removals";
    const live = await freshTableState();
    for (const event of events) await live.dispatchTableEvent(tableId, event);
    for (const event of [
      { type: "token:removed", id: token.id },
      { type: "map:removed", id: map.id },
      { type: "player:revoked", playerId: player.id },
      { type: "audio:stopped" },
      { type: "board:unpaused" },
      { type: "board:closed" },
    ] satisfies TableEvent[]) {
      await live.dispatchTableEvent(tableId, event);
    }

    const inMemory = await live.getState(tableId);
    const reloaded = await (await freshTableState()).getState(tableId);

    expect(reloaded).toEqual(inMemory);
    expect(reloaded.tokens).toEqual([]);
    expect(reloaded.maps).toEqual([]);
    expect(reloaded.audio).toBeNull();
    expect(reloaded.open).toBe(false);
    expect(reloaded.players[0].status).toBe("revoked");
  });
});
