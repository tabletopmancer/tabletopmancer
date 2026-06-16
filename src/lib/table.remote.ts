import { command } from "$app/server";
import { parseFormula, type ParsedFormula } from "$lib/dice.js";
import { requireDm, requireParticipant } from "$lib/server/auth.js";
import { dispatchTableEvent, getState, getTableEmitter } from "$lib/server/table-state.js";
import { error } from "@sveltejs/kit";
import { randomUUID } from "node:crypto";
import * as v from "valibot";

const PositionSchema = v.object({
  x: v.pipe(v.number(), v.finite()),
  y: v.pipe(v.number(), v.finite()),
});

const FogPatchSchema = v.object({
  mode: v.picklist(["reveal", "hide"]),
  x: v.pipe(v.number(), v.finite()),
  y: v.pipe(v.number(), v.finite()),
  radius: v.pipe(v.number(), v.finite(), v.minValue(0)),
});

export const placeToken = command(
  v.object({
    tableId: v.string(),
    name: v.pipe(v.string(), v.nonEmpty()),
    imageUrl: v.optional(v.string()),
    position: PositionSchema,
  }),
  async (arg) => {
    requireDm();
    const token: Token = {
      id: randomUUID(),
      name: arg.name,
      imageUrl: arg.imageUrl,
      position: arg.position,
    };
    await dispatchTableEvent(arg.tableId, { type: "token:placed", token });
  },
);

/** Throws 403 unless the player owns the token; returns false while the board is paused. */
async function playerMayMoveToken(
  tableId: string,
  player: Player,
  tokenId: string,
): Promise<boolean> {
  const state = await getState(tableId);
  if (state.paused) return false;
  const token = state.tokens.find((t) => t.id === tokenId);
  if (token?.owner !== player.id) error(403, "You can only move your own tokens");
  return true;
}

export const moveToken = command(
  v.object({ tableId: v.string(), tokenId: v.string(), position: PositionSchema }),
  async (arg) => {
    const player = await requireParticipant(arg.tableId);
    if (player && !(await playerMayMoveToken(arg.tableId, player, arg.tokenId))) return;
    await dispatchTableEvent(arg.tableId, {
      type: "token:moved",
      id: arg.tokenId,
      position: arg.position,
    });
  },
);

export const pauseBoard = command(v.string(), async (tableId) => {
  requireDm();
  await dispatchTableEvent(tableId, { type: "board:paused" });
});

export const unpauseBoard = command(v.string(), async (tableId) => {
  requireDm();
  await dispatchTableEvent(tableId, { type: "board:unpaused" });
});

export const openTable = command(v.string(), async (tableId) => {
  requireDm();
  await dispatchTableEvent(tableId, { type: "board:opened" });
});

export const closeTable = command(v.string(), async (tableId) => {
  requireDm();
  await dispatchTableEvent(tableId, { type: "board:closed" });
});

export const assignTokenOwner = command(
  v.object({ tableId: v.string(), tokenId: v.string(), owner: v.nullable(v.string()) }),
  async (arg) => {
    requireDm();
    await dispatchTableEvent(arg.tableId, {
      type: "token:owner-assigned",
      id: arg.tokenId,
      owner: arg.owner ?? undefined,
    });
  },
);

export const removeToken = command(
  v.object({ tableId: v.string(), tokenId: v.string() }),
  async (arg) => {
    requireDm();
    await dispatchTableEvent(arg.tableId, { type: "token:removed", id: arg.tokenId });
  },
);

export const placeMap = command(
  v.object({ tableId: v.string(), assetUrl: v.string(), position: PositionSchema }),
  async (arg) => {
    requireDm();
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
  v.object({ tableId: v.string(), mapId: v.string(), position: PositionSchema }),
  async (arg) => {
    requireDm();
    await dispatchTableEvent(arg.tableId, {
      type: "map:moved",
      id: arg.mapId,
      position: arg.position,
    });
  },
);

export const removeMap = command(
  v.object({ tableId: v.string(), mapId: v.string() }),
  async (arg) => {
    requireDm();
    await dispatchTableEvent(arg.tableId, { type: "map:removed", id: arg.mapId });
  },
);

export const updateFog = command(
  v.object({ tableId: v.string(), mapId: v.string(), patch: FogPatchSchema }),
  async (arg) => {
    requireDm();
    await dispatchTableEvent(arg.tableId, {
      type: "fog:updated",
      mapId: arg.mapId,
      patch: arg.patch,
    });
  },
);

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

function buildRoll(
  player: Player | null,
  formula: string,
  parsed: ParsedFormula,
  wantPrivate: boolean | undefined,
): DiceRoll {
  const dice = Array.from(
    { length: parsed.count },
    () => Math.floor(Math.random() * parsed.sides) + 1,
  );
  const total = dice.reduce((sum, d) => sum + d, 0) + parsed.modifier;
  return {
    id: randomUUID(),
    player: player?.name ?? "DM",
    formula,
    dice,
    modifier: parsed.modifier,
    total,
    private: player === null && wantPrivate !== false,
    timestamp: Date.now(),
  };
}

export const rollDice = command(
  v.object({ tableId: v.string(), formula: v.string(), private: v.optional(v.boolean()) }),
  async (arg) => {
    const player = await requireParticipant(arg.tableId);

    const formula = arg.formula.trim();
    const parsed = parseFormula(formula);
    if (!parsed) return;

    const roll = buildRoll(player, formula, parsed, arg.private);
    await dispatchTableEvent(arg.tableId, { type: "dice:rolled", roll });

    if (player) {
      await captureInitiative(arg.tableId, player.id, roll.total);
    }
  },
);

export const actOnPlayer = command(
  v.object({
    tableId: v.string(),
    playerId: v.string(),
    action: v.picklist(["approve", "deny", "revoke"]),
  }),
  async (arg) => {
    requireDm();
    const state = await getState(arg.tableId);
    if (!state.players.some((p) => p.id === arg.playerId)) return;

    const actionEvents = {
      approve: "player:approved",
      deny: "player:denied",
      revoke: "player:revoked",
    } as const;

    await dispatchTableEvent(arg.tableId, {
      type: actionEvents[arg.action],
      playerId: arg.playerId,
    });
  },
);

export const pingTable = command(
  v.object({ tableId: v.string(), position: PositionSchema }),
  async (arg) => {
    const player = await requireParticipant(arg.tableId);
    const event: TableEvent = {
      type: "ping",
      position: arg.position,
      player: player?.name ?? "DM",
    };
    getTableEmitter(arg.tableId).emit("table-event", event);
  },
);
