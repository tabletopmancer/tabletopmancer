# One SQLite database per table

Each table owns a directory under `$TABLETOPMANCER_HOME/saves` with its own
`db.sqlite`, instead of a shared database with a `table_id` column. A table is
then copied, moved or deleted as a folder, and self-hosting needs no database
service.

- **Consequences**: No query across tables — the tables list reads the saves
  directory. Schema changes are applied per file at open time, hence `migrate()`
  in `db.ts` instead of a migration tool.
