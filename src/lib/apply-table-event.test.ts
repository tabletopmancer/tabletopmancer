import { beforeEach, describe, expect, it } from "vitest";
import { applyTableEvent } from "./apply-table-event.js";

function makeToken(overrides: Partial<Token> = {}): Token {
  return { id: "t1", name: "Hero", position: { x: 0, y: 0 }, ...overrides };
}

function makeMap(overrides: Partial<BoardMap> = {}): BoardMap {
  return { id: "m1", assetUrl: "/map.uvtt", position: { x: 0, y: 0 }, fog: [], ...overrides };
}

function makeRoll(overrides: Partial<DiceRoll> = {}): DiceRoll {
  return {
    id: "r1",
    player: "Alice",
    formula: "1d6",
    dice: [4],
    modifier: 0,
    total: 4,
    private: false,
    timestamp: 1,
    ...overrides,
  };
}

function makePlayer(overrides: Partial<Player> = {}): Player {
  return { id: "p1", name: "Alice", status: "pending", ...overrides };
}

let state: BoardState;

beforeEach(() => {
  state = {
    tokens: [],
    maps: [],
    initiative: null,
    rollHistory: [],
    players: [],
    paused: false,
    open: false,
    audio: null,
  };
});

describe("token events", () => {
  it("places a token", () => {
    const token = makeToken();
    applyTableEvent(state, { type: "token:placed", token });
    expect(state.tokens).toEqual([token]);
  });

  it("moves a token", () => {
    state.tokens = [makeToken()];
    applyTableEvent(state, { type: "token:moved", id: "t1", position: { x: 5, y: 7 } });
    expect(state.tokens[0].position).toEqual({ x: 5, y: 7 });
  });

  it("ignores moves for unknown tokens", () => {
    state.tokens = [makeToken()];
    applyTableEvent(state, { type: "token:moved", id: "nope", position: { x: 5, y: 7 } });
    expect(state.tokens[0].position).toEqual({ x: 0, y: 0 });
  });

  it("removes a token", () => {
    state.tokens = [makeToken(), makeToken({ id: "t2" })];
    applyTableEvent(state, { type: "token:removed", id: "t1" });
    expect(state.tokens.map((t) => t.id)).toEqual(["t2"]);
  });

  it("assigns and clears a token owner", () => {
    state.tokens = [makeToken()];
    applyTableEvent(state, { type: "token:owner-assigned", id: "t1", owner: "p1" });
    expect(state.tokens[0].owner).toBe("p1");
    applyTableEvent(state, { type: "token:owner-assigned", id: "t1", owner: undefined });
    expect("owner" in state.tokens[0]).toBe(false);
  });
});

describe("map events", () => {
  it("places a map", () => {
    const map = makeMap();
    applyTableEvent(state, { type: "map:placed", map });
    expect(state.maps).toEqual([map]);
  });

  it("moves a map", () => {
    state.maps = [makeMap()];
    applyTableEvent(state, { type: "map:moved", id: "m1", position: { x: -3, y: 9 } });
    expect(state.maps[0].position).toEqual({ x: -3, y: 9 });
  });

  it("removes a map", () => {
    state.maps = [makeMap()];
    applyTableEvent(state, { type: "map:removed", id: "m1" });
    expect(state.maps).toEqual([]);
  });

  it("appends fog patches to the right map", () => {
    state.maps = [makeMap(), makeMap({ id: "m2" })];
    const patch: FogPatch = { mode: "reveal", x: 1, y: 2, radius: 50 };
    applyTableEvent(state, { type: "fog:updated", mapId: "m2", patch });
    expect(state.maps[0].fog).toEqual([]);
    expect(state.maps[1].fog).toEqual([patch]);
  });

  it("ignores fog updates for unknown maps", () => {
    state.maps = [makeMap()];
    applyTableEvent(state, {
      type: "fog:updated",
      mapId: "nope",
      patch: { mode: "hide", x: 0, y: 0, radius: 10 },
    });
    expect(state.maps[0].fog).toEqual([]);
  });
});

describe("dice and initiative events", () => {
  it("appends rolls to the history", () => {
    const roll = makeRoll();
    applyTableEvent(state, { type: "dice:rolled", roll });
    expect(state.rollHistory).toEqual([roll]);
  });

  it("sets and clears the initiative tracker", () => {
    const tracker: InitiativeTracker = {
      active: true,
      entries: [{ tokenId: "t1", name: "Hero", initiative: 12, isNPC: false }],
      turn: 0,
    };
    applyTableEvent(state, { type: "initiative:updated", tracker });
    expect(state.initiative).toEqual(tracker);
    applyTableEvent(state, { type: "initiative:updated", tracker: null });
    expect(state.initiative).toBeNull();
  });

  it("treats pings as no-ops", () => {
    const before = structuredClone(state);
    applyTableEvent(state, { type: "ping", position: { x: 1, y: 1 }, player: "Alice" });
    expect(state).toEqual(before);
  });
});

describe("player events", () => {
  it("adds a joining player", () => {
    const player = makePlayer();
    applyTableEvent(state, { type: "player:joined", player });
    expect(state.players).toEqual([player]);
  });

  it("ignores duplicate joins", () => {
    state.players = [makePlayer()];
    applyTableEvent(state, { type: "player:joined", player: makePlayer({ name: "Imposter" }) });
    expect(state.players).toHaveLength(1);
    expect(state.players[0].name).toBe("Alice");
  });

  it.each([
    ["player:approved", "approved"],
    ["player:denied", "denied"],
    ["player:revoked", "revoked"],
  ] as const)("%s sets the status", (type, status) => {
    state.players = [makePlayer()];
    applyTableEvent(state, { type, playerId: "p1" });
    expect(state.players[0].status).toBe(status);
  });

  it("ignores status changes for unknown players", () => {
    state.players = [makePlayer()];
    applyTableEvent(state, { type: "player:approved", playerId: "nope" });
    expect(state.players[0].status).toBe("pending");
  });
});

describe("board events", () => {
  it("pauses and unpauses the board", () => {
    applyTableEvent(state, { type: "board:paused" });
    expect(state.paused).toBe(true);
    applyTableEvent(state, { type: "board:unpaused" });
    expect(state.paused).toBe(false);
  });

  it("opens and closes the table", () => {
    applyTableEvent(state, { type: "board:opened" });
    expect(state.open).toBe(true);
    applyTableEvent(state, { type: "board:closed" });
    expect(state.open).toBe(false);
  });
});
