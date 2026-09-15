# Table events as the only mutation path

Every board change is a `TableEvent` passed to `dispatchTableEvent`: persist,
apply to the cached board, broadcast. Writing SQL in each remote function and
letting clients refetch gave no way to keep the cache and the connected clients
in step.

- **Consequences**: `applyTableEvent` is pure and shared with the browser, so
  both sides fold the same event. A direct SQL write bypasses the cache and the
  clients, and leaves both stale.
