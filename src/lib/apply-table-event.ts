type Handler<T extends TableEvent["type"]> = (
  state: BoardState,
  event: Extract<TableEvent, { type: T }>,
) => void;

const handlers = {
  "token:placed": (state, event) => state.tokens.push(event.token),
  "token:moved": (state, event) => {
    const t = state.tokens.find((t) => t.id === event.id);
    if (t) t.position = event.position;
  },
  "token:removed": (state, event) => {
    state.tokens = state.tokens.filter((t) => t.id !== event.id);
  },
  "token:owner-assigned": (state, event) => {
    const t = state.tokens.find((t) => t.id === event.id);
    if (t) {
      if (event.owner === undefined) {
        delete t.owner;
      } else {
        t.owner = event.owner;
      }
    }
  },
  "map:placed": (state, event) => state.maps.push(event.map),
  "map:removed": (state, event) => {
    state.maps = state.maps.filter((m) => m.id !== event.id);
  },
  "map:moved": (state, event) => {
    const m = state.maps.find((m) => m.id === event.id);
    if (m) m.position = event.position;
  },
  "fog:updated": (state, event) => {
    const m = state.maps.find((m) => m.id === event.mapId);
    if (m) {
      m.fog ??= [];
      m.fog.push(event.patch);
    }
  },
  "dice:rolled": (state, event) => state.rollHistory.push(event.roll),
  ping: () => {},
  "initiative:updated": (state, event) => {
    state.initiative = event.tracker;
  },
  "player:joined": (state, event) => {
    if (!state.players.find((p) => p.id === event.player.id)) {
      state.players.push(event.player);
    }
  },
  "player:approved": (state, event) => {
    const p = state.players.find((p) => p.id === event.playerId);
    if (p) p.status = "approved";
  },
  "player:denied": (state, event) => {
    const p = state.players.find((p) => p.id === event.playerId);
    if (p) p.status = "denied";
  },
  "player:revoked": (state, event) => {
    const p = state.players.find((p) => p.id === event.playerId);
    if (p) p.status = "revoked";
  },
} satisfies { [K in TableEvent["type"]]: Handler<K> };

export function applyTableEvent(state: BoardState, event: TableEvent): void {
  (handlers[event.type] as Handler<typeof event.type>)(state, event);
}
