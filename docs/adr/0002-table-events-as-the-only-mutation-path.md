# Table events as the only mutation path

Every board change is a `TableEvent` that goes through `dispatchTableEvent`:
persist, apply to the cached board, broadcast. The alternative, writing to
SQLite in each remote function and letting clients refetch, gave no way to keep
the cached board and the connected clients in step.

- **Consequences**: `applyTableEvent` stays pure and is shared with the browser,
  so server and client fold the same event into the same shape. Adding an event
  type needs the union, the apply map and the persist map; `satisfies` makes a
  missing case a type error. Real-time correctness now depends on every mutation
  using this path — a direct SQL write would leave the cache and the clients
  stale.
