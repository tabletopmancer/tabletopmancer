# Glossary

## Table

One game, with its own saved data: board, players, rolls, codexes. A table is
identified by its name. Its directory name is a hash of that name, so renaming a
table is not possible.

**Relates to**: Board, Table event

## Board

The live state of a table: tokens, maps, initiative, roll history, players,
paused flag, open flag, audio. The board is held in memory and rebuilt from
SQLite when it is not cached.

**Avoid**: canvas, scene

## Table event

The only way to change a board. Each event has a type (`token:moved`,
`dice:rolled`, …), is written to SQLite, applied to the cached board, then sent
to every connected client. See
[ADR 0002](adr/0002-table-events-as-the-only-mutation-path.md).

**Relates to**: Board, Event log

## Event log

The `event_log` table. It holds the events that a DM can review in the History
tab. Frequent events (`token:moved`, `map:moved`, `fog:updated`, `ping`) are not
logged, because they are noise.

**Ambiguity**: The event log is a record for humans, not the source of the
board. The board is rebuilt from the normal tables, not replayed from the log.

## DM

The person who runs the game. There is one DM role for the whole server, not one
per table. The DM has no player record, and gets a neutral dice color. See
[ADR 0003](adr/0003-dm-login-by-startup-token.md).

**Avoid**: GM, admin, owner

## Player

A person who joined one table. A player has a status: `pending`, `approved`,
`denied` or `revoked`. Only an approved player can read the board or act on it.

## Codex

A directory in a table's `codexes/` folder that supplies content. A *system*
codex holds a ruleset and has a `codex.json`. A *campaign* codex holds a story
and has a `campaign.json`. A codex can also be shipped as a `.zip`, which the
server extracts on first load.

**Relates to**: Asset

## Asset

One file inside a codex: image, map, markdown page, audio, JSON. Assets are
listed when a table page loads and are served through the table's asset route.
A `.ttmignore` file in a codex directory hides files from that listing.

## Token

A figure on the board. A token can be owned by a player. An owned token is the
only thing that a player can move, and only while the board is not paused.

## Map

A background image placed on the board. A map carries its fog patches.

## Fog patch

A circle that hides or reveals a part of one map. Fog is cumulative: each patch
is appended, patches are never removed or merged.

**Avoid**: fog of war layer

## Ping

A short mark on the board, to show a position to the other people at the table.
A ping is sent to connected clients only. It is not saved.

## Roll

The result of a dice formula (`2d6+3`). A roll keeps the individual dice, the
modifier, the total, the player name and the player color. A DM roll is private
by default, and is not sent to players.

**Relates to**: Initiative tracker

## Initiative tracker

The turn order for a fight. Each entry points to a token. An entry with no
initiative value is filled automatically by the next roll of the player who owns
that token. Entries marked as NPC are removed before the tracker is sent to a
player.

## Saves directory

`$TABLETOPMANCER_HOME/saves`. It holds one directory per table, each with
`meta.json`, `db.sqlite` and an optional `codexes/`.

## UVTT

A map file format exported by map editors (`.uvtt`, `.dd2vtt`). It holds the
image plus walls, lights and grid data. See `schema/dd2vtt.json`.
