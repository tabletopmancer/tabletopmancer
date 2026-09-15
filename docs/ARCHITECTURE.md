# Architecture

Terms are defined in [GLOSSARY.md](GLOSSARY.md).

## Single process

Boards are cached in memory and broadcast through one `EventEmitter` per table,
so a second server process would not see the events of the first. The app cannot
be scaled horizontally without a shared broker. The board cache and the SQLite
handle cache each hold 100 tables, least-recently-used evicted.

## Storage

One SQLite file per table under `TABLETOPMANCER_HOME`. No central database and
no migration tool: columns added later are applied at open time by `migrate()`.
See [ADR 0001](adr/0001-one-sqlite-database-per-table.md) and
[ADR 0004](adr/0004-table-directory-named-by-hash.md).

## Write path

`dispatchTableEvent` persists the event and its log row in one transaction,
folds it into the cached board, then broadcasts it. A ping skips this path: it is
broadcast only.

`applyTableEvent` is pure and runs on both sides, so the client folds the same
event into its own copy. A new event type needs the `TableEvent` union, the
apply map and the persist map; both maps use `satisfies`, so a missing case
fails the typecheck. See
[ADR 0002](adr/0002-table-events-as-the-only-mutation-path.md).

## Transport

Clients reach the server only through remote functions: `command`, `query`, and
`query.live` generators for the board and the join screen. No REST, no
websocket. See [ADR 0005](adr/0005-remote-functions-for-transport.md).

## Authorization

- **DM**: server-wide, from the `ttm_dm` cookie. See
  [ADR 0003](adr/0003-dm-login-by-startup-token.md).
- **Player**: per table, from `ttm_token` mapped to a row in that table's
  `sessions`.

`hooks.server.ts` guards pages by path; a remote function is a public endpoint,
so each one repeats the check with `requireDm` or `requireParticipant`.

## Filtering by role

The server strips DM-only data from the first board snapshot and from every
later event: private rolls, NPC initiative entries, the audio name. Never filter
in a component.

## Asset serving

`/table/[id]/asset/[...path]` requires an approved participant and checks the
resolved path against the table's `codexes/` directory, to stop traversal.

## Codex loading

The table page globs `codexes/*/codex.json` and `*/campaign.json`, then each
codex directory for known extensions. A zip codex is extracted first, cached by
a `.ttm-zip-source` marker holding the zip mtime; a directory without that
marker belongs to the user and is never overwritten.

## Code health gate

`fallow audit` fails a pull request on complexity, duplication and dead code.
This is why helpers are extracted from functions that would otherwise read as
one block.
