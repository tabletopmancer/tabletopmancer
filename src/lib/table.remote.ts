import { command } from "$app/server";
import { dispatchDelta, getState, getTableEmitter } from "$lib/server/table-state.js";
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
    await dispatchDelta(arg.tableId, { type: "token:placed", token });
  },
);

export const moveToken = command(
  "unchecked",
  async (arg: { tableId: string; tokenId: string; position: Position }) => {
    await dispatchDelta(arg.tableId, { type: "token:moved", id: arg.tokenId, position: arg.position });
  },
);

export const assignTokenOwner = command(
  "unchecked",
  async (arg: { tableId: string; tokenId: string; owner: string | null }) => {
    await dispatchDelta(arg.tableId, {
      type: "token:owner-assigned",
      id: arg.tokenId,
      owner: arg.owner ?? undefined,
    });
  },
);

export const removeToken = command(
  "unchecked",
  async (arg: { tableId: string; tokenId: string }) => {
    await dispatchDelta(arg.tableId, { type: "token:removed", id: arg.tokenId });
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
    await dispatchDelta(arg.tableId, { type: "map:placed", map });
  },
);

export const moveMap = command(
  "unchecked",
  async (arg: { tableId: string; mapId: string; position: Position }) => {
    await dispatchDelta(arg.tableId, { type: "map:moved", id: arg.mapId, position: arg.position });
  },
);

export const removeMap = command(
  "unchecked",
  async (arg: { tableId: string; mapId: string }) => {
    await dispatchDelta(arg.tableId, { type: "map:removed", id: arg.mapId });
  },
);

export const updateFog = command(
  "unchecked",
  async (arg: { tableId: string; mapId: string; patch: FogPatch }) => {
    await dispatchDelta(arg.tableId, { type: "fog:updated", mapId: arg.mapId, patch: arg.patch });
  },
);

const FORMULA_RE = /^(\d+)d(\d+)([+-]\d+)?$/i;

function parseFormula(formula: string): { count: number; sides: number; modifier: number } | null {
  const m = formula.trim().match(FORMULA_RE);
  if (!m) return null;
  return { count: parseInt(m[1]), sides: parseInt(m[2]), modifier: m[3] ? parseInt(m[3]) : 0 };
}

async function captureInitiative(tableId: string, playerId: string, rollTotal: number): Promise<void> {
  const state = await getState(tableId);
  if (!state.initiative?.active) return;

  const playerToken = state.tokens.find((t) => t.owner === playerId);
  if (!playerToken) return;

  const entry = state.initiative.entries.find(
    (e) => e.tokenId === playerToken.id && e.initiative === null,
  );
  if (!entry) return;

  const updatedEntries = [...state.initiative.entries]
    .map((e) =>
      e.tokenId === playerToken.id && e.initiative === null ? { ...e, initiative: rollTotal } : e,
    )
    .sort((a, b) => {
      if (a.initiative === null && b.initiative === null) return 0;
      if (a.initiative === null) return 1;
      if (b.initiative === null) return -1;
      return b.initiative - a.initiative;
    });

  await dispatchDelta(tableId, {
    type: "initiative:updated",
    tracker: { ...state.initiative, entries: updatedEntries },
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
      private: isDM && (arg.private ?? true),
      timestamp: Date.now(),
    };

    await dispatchDelta(arg.tableId, { type: "dice:rolled", roll });

    if (!isDM && arg.playerId) {
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

    await dispatchDelta(arg.tableId, { type: actionEvents[arg.action], playerId: arg.playerId });
  },
);

export const pingTable = command(
  "unchecked",
  async (arg: { tableId: string; position: Position; player: string }) => {
    const delta: DeltaEvent = { type: "ping", position: arg.position, player: arg.player };
    getTableEmitter(arg.tableId).emit("delta", delta);
  },
);
