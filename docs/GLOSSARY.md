# Glossary

## Table

One game, with its own board, players, rolls and codexes. The table name is its
ID. The directory name is a hash of that name, so a table cannot be renamed.

## Board

The live state of a table: tokens, maps, initiative, roll history, players,
paused, open, audio.

**Avoid**: scene, canvas

## Table event

The only way to change a board. Persisted, applied to the cached board, then
broadcast. See [ADR 0002](adr/0002-table-events-as-the-only-mutation-path.md).

## Event log

The rows a DM reads in the History tab. It is a record for humans: the board is
rebuilt from the normal tables, never replayed from the log. Frequent events
(moves, fog, ping) are left out.

## DM

The person who runs the game. The role is server-wide, not per table, and has no
player record. See [ADR 0003](adr/0003-dm-login-by-startup-token.md).

**Avoid**: GM, admin, owner

## Player

A person who joined one table, with status `pending`, `approved`, `denied` or
`revoked`. Only an approved player can read or change the board.

## Codex

A directory in a table's `codexes/` that supplies content: a _system_ codex has
`codex.json`, a _campaign_ codex has `campaign.json`. A `.zip` codex is
extracted on first load.

## Asset

One file inside a codex: image, map, markdown, audio or JSON. A `.ttmignore`
file hides files from the listing.

## Token

A figure on the board. A player can move only a token they own, and only while
the board is not paused.

## Map

A background image on the board. It carries its fog patches.

## Fog patch

A circle that hides or reveals part of one map. Fog is cumulative: patches are
appended, never removed or merged.

## Ping

A mark that shows a position to the table. Broadcast only, never saved.

## Roll

The result of a dice formula (`2d6+3`), with the individual dice, the player
name and the player color. A DM roll is private unless stated otherwise.

## Initiative tracker

The turn order. Each entry points to a token. An empty entry is filled by the
next roll of the player who owns that token. NPC entries are removed before the
tracker reaches a player.

## Saves directory

`$TABLETOPMANCER_HOME/saves`: one directory per table, each with `meta.json`,
`db.sqlite` and an optional `codexes/`.

## UVTT

A map file (`.uvtt`, `.dd2vtt`) that holds the image plus walls, lights and grid
data. See `schema/dd2vtt.json`.
