# Architecture

Terms used here are defined in [GLOSSARY.md](GLOSSARY.md).

## Single node, in-memory state

The server keeps each board in memory and broadcasts events through a Node
`EventEmitter` per table. Two server processes would therefore not see each
other's events. The app must run as one process; it cannot be scaled
horizontally without a shared broker.

Both the board cache and the SQLite handle cache hold at most 100 tables and
evict the least recently used entry.

## Storage on the filesystem

All data lives under `TABLETOPMANCER_HOME` (default
`~/.local/share/tabletopmancer`), one SQLite database per table. There is no
central database and no migration tool: new columns are added at open time by
`migrate()` in `src/lib/server/db.ts`. See
[ADR 0001](adr/0001-one-sqlite-database-per-table.md) and
[ADR 0004](adr/0004-table-directory-named-by-hash.md).

## Write path

Every mutation goes through `dispatchTableEvent`:

1. `persistTableEvent` writes the change, and the log row, in one SQLite
   transaction.
2. `applyTableEvent` updates the cached board.
3. The emitter sends the event to the connected clients.

`applyTableEvent` is pure and shared with the browser, so the client applies the
same event to its own copy of the board. A new event type is only complete when
it is added in three places: the `TableEvent` union in `src/app.d.ts`, the
handler map in `apply-table-event.ts`, and the persister map in
`persist-table-event.ts`. Both maps use `satisfies` over the union, so a missing
handler fails the typecheck. See
[ADR 0002](adr/0002-table-events-as-the-only-mutation-path.md).

A ping does not use this path. It is emitted directly, and is never saved.

## Client transport

Clients call remote functions (`*.remote.ts`). Reads and mutations are `query`
and `command`; the live board and the join screen use `query.live` generators
that stream events. There is no REST API and no websocket layer. See
[ADR 0005](adr/0005-remote-functions-for-transport.md).

## Authorization

Two independent mechanisms:

- **DM**: server-wide. `hooks.server.ts` sets `locals.role` from the `ttm_dm`
  cookie. See [ADR 0003](adr/0003-dm-login-by-startup-token.md).
- **Player**: per table. The `ttm_token` cookie maps to a player row in that
  table's `sessions` table. A request for a table page without an approved
  player is redirected to the join page.

Remote functions repeat the check with `requireDm` or `requireParticipant`,
because a remote function is a public endpoint and the hook cannot cover it by
path alone.

## Filtering by role

A player must never receive DM-only data. `board.remote.ts` filters both the
first board snapshot and every later event: private rolls are dropped, NPC
initiative entries are removed, and the audio name is stripped. Filtering
happens on the server, never in the component.

## Asset serving

`/table/[id]/asset/[...path]` reads files from the table's `codexes/` directory.
The resolved path is checked against that directory before the read, to stop
path traversal. The route requires an approved participant, so codex content is
never public.

## Codex loading

The table page load scans `codexes/*/codex.json` and `codexes/*/campaign.json`,
then globs each codex directory for known asset extensions. A `*.zip` codex is
extracted first into a sibling directory, and the extraction is cached with a
`.ttm-zip-source` marker file that holds the zip modification time. A directory
without that marker is never overwritten, because it belongs to the user.

## Code health gate

`fallow audit` runs on changed files in CI and fails a pull request on
complexity, duplication and dead code. This is why helpers are often extracted
from a function that would otherwise read as one block.
