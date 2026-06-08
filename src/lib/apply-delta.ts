type Handler<T extends DeltaEvent["type"]> = (
  state: BoardState,
  delta: Extract<DeltaEvent, { type: T }>,
) => void;

const handlers = {
  "token:placed": (state, delta) => state.tokens.push(delta.token),
  "token:moved": (state, delta) => {
    const t = state.tokens.find((t) => t.id === delta.id);
    if (t) t.position = delta.position;
  },
  "token:removed": (state, delta) => {
    state.tokens = state.tokens.filter((t) => t.id !== delta.id);
  },
  "token:owner-assigned": (state, delta) => {
    const t = state.tokens.find((t) => t.id === delta.id);
    if (t) t.owner = delta.owner;
  },
  "map:placed": (state, delta) => state.maps.push(delta.map),
  "map:removed": (state, delta) => {
    state.maps = state.maps.filter((m) => m.id !== delta.id);
  },
  "fog:updated": (state, delta) => {
    const m = state.maps.find((m) => m.id === delta.mapId);
    if (m) {
      m.fog ??= {};
      for (const cell of delta.patch.cells) {
        m.fog[`${cell.x},${cell.y}`] = cell.visible;
      }
    }
  },
  "dice:rolled": (state, delta) => state.rollHistory.push(delta.roll),
  ping: () => {},
  "initiative:updated": (state, delta) => {
    state.initiative = delta.tracker;
  },
  "player:joined": (state, delta) => {
    if (!state.players.find((p) => p.id === delta.player.id)) {
      state.players.push(delta.player);
    }
  },
  "player:approved": (state, delta) => {
    const idx = state.players.findIndex((p) => p.id === delta.player.id);
    if (idx >= 0) state.players[idx] = delta.player;
    else state.players.push(delta.player);
  },
  "player:revoked": (state, delta) => {
    state.players = state.players.filter((p) => p.id !== delta.playerId);
  },
} satisfies { [K in DeltaEvent["type"]]: Handler<K> };

export function applyDelta(state: BoardState, delta: DeltaEvent): void {
  (handlers[delta.type] as Handler<typeof delta.type>)(state, delta);
}
