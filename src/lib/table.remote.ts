import { command } from "$app/server";
import { dispatchTableEvent, getState, getTableEmitter } from "$lib/server/table-state.js";
import { randomUUID } from "node:crypto";

export const placeToken = command(
  "unchecked",
  async (arg: { tableId: string; name: string; imageUrl?: string; position: Position }) => {
    const token: Token = {
      id: randomUUID(),
      name: arg.name,
      imageUrl: arg.imageUrl,
      position: arg.position,
    };
    await dispatchTableEvent(arg.tableId, { type: "token:placed", token });
  },
);

export const moveToken = command(
  "unchecked",
  async (arg: { tableId: string; tokenId: string; position: Position }) => {
    await dispatchTableEvent(arg.tableId, {
      type: "token:moved",
      id: arg.tokenId,
      position: arg.position,
    });
  },
);

export const assignTokenOwner = command(
  "unchecked",
  async (arg: { tableId: string; tokenId: string; owner: string | null }) => {
    await dispatchTableEvent(arg.tableId, {
      type: "token:owner-assigned",
      id: arg.tokenId,
      owner: arg.owner ?? undefined,
    });
  },
);

export const removeToken = command(
  "unchecked",
  async (arg: { tableId: string; tokenId: string }) => {
    await dispatchTableEvent(arg.tableId, { type: "token:removed", id: arg.tokenId });
  },
);

export const placeMap = command(
  "unchecked",
  async (arg: { tableId: string; assetUrl: string; position: Position }) => {
    const map: BoardMap = {
      id: randomUUID(),
      assetUrl: arg.assetUrl,
      position: arg.position,
      fog: [],
    };
    await dispatchTableEvent(arg.tableId, { type: "map:placed", map });
  },
);

export const moveMap = command(
  "unchecked",
  async (arg: { tableId: string; mapId: string; position: Position }) => {
    await dispatchTableEvent(arg.tableId, { type: "map:moved", id: arg.mapId, position: arg.position });
  },
);

export const removeMap = command("unchecked", async (arg: { tableId: string; mapId: string }) => {
  await dispatchTableEvent(arg.tableId, { type: "map:removed", id: arg.mapId });
});

export const updateFog = command(
  "unchecked",
  async (arg: { tableId: string; mapId: string; patch: FogPatch }) => {
    await dispatchTableEvent(arg.tableId, { type: "fog:updated", mapId: arg.mapId, patch: arg.patch });
  },
);

const FORMULA_RE = /^(\d+)d(\d+)([+-]\d+)?$/i;

function parseFormula(formula: string): { count: number; sides: number; modifier: number } | null {
  const m = formula.trim().match(FORMULA_RE);
  if (!m) return null;
  return { count: parseInt(m[1]), sides: parseInt(m[2]), modifier: m[3] ? parseInt(m[3]) : 0 };
}

function sortByInitiative(a: InitiativeEntry, b: InitiativeEntry): number {
  if (a.initiative === null) return b.initiative === null ? 0 : 1;
  if (b.initiative === null) return -1;
  return b.initiative - a.initiative;
}

function findPendingEntry(
  entries: InitiativeEntry[],
  tokenId: string,
): InitiativeEntry | undefined {
  return entries.find((e) => e.tokenId === tokenId && e.initiative === null);
}

function applyRoll(entry: InitiativeEntry, tokenId: string, roll: number): InitiativeEntry {
  return entry.tokenId === tokenId ? { ...entry, initiative: entry.initiative ?? roll } : entry;
}

function activeInitiative(state: BoardState): InitiativeTracker | null {
  return state.initiative?.active ? state.initiative : null;
}

async function captureInitiative(
  tableId: string,
  playerId: string,
  rollTotal: number,
): Promise<void> {
  const state = await getState(tableId);
  const initiative = activeInitiative(state);
  if (!initiative) return;

  const playerToken = state.tokens.find((t) => t.owner === playerId);
  if (!playerToken) return;

  if (!findPendingEntry(initiative.entries, playerToken.id)) return;

  const updatedEntries = initiative.entries
    .map((e) => applyRoll(e, playerToken.id, rollTotal))
    .toSorted(sortByInitiative);

  await dispatchTableEvent(tableId, {
    type: "initiative:updated",
    tracker: { ...initiative, entries: updatedEntries },
  });
}

export const rollDice = command(
  "unchecked",
  async (arg: {
    tableId: string;
    formula: string;
    private?: boolean;
    playerName: string;
    playerId: string | null;
  }) => {
    const formula = arg.formula.trim();
    const parsed = parseFormula(formula);
    if (!parsed) return;

    const isDM = arg.playerId === null;
    const dice = Array.from(
      { length: parsed.count },
      () => Math.floor(Math.random() * parsed.sides) + 1,
    );
    const total = dice.reduce((sum, d) => sum + d, 0) + parsed.modifier;
    const roll: DiceRoll = {
      id: randomUUID(),
      player: arg.playerName,
      formula,
      dice,
      modifier: parsed.modifier,
      total,
      private: isDM && arg.private !== false,
      timestamp: Date.now(),
    };

    await dispatchTableEvent(arg.tableId, { type: "dice:rolled", roll });

    if (arg.playerId) {
      await captureInitiative(arg.tableId, arg.playerId, total);
    }
  },
);

export const actOnPlayer = command(
  "unchecked",
  async (arg: { tableId: string; playerId: string; action: "approve" | "deny" | "revoke" }) => {
    const state = await getState(arg.tableId);
    if (!state.players.some((p) => p.id === arg.playerId)) return;

    const actionEvents = {
      approve: "player:approved",
      deny: "player:denied",
      revoke: "player:revoked",
    } as const;

    await dispatchTableEvent(arg.tableId, { type: actionEvents[arg.action], playerId: arg.playerId });
  },
);

export const pingTable = command(
  "unchecked",
  async (arg: { tableId: string; position: Position; player: string }) => {
    const event: TableEvent = { type: "ping", position: arg.position, player: arg.player };
    getTableEmitter(arg.tableId).emit("table-event", event);
  },
);
