# One SQLite database per table

Each table owns a directory under `$TABLETOPMANCER_HOME/saves`, with its own
`db.sqlite` and its own copy of the schema. A shared database with a `table_id`
column was the alternative; a per-table file makes a table copyable, movable and
deletable as a folder, and keeps the self-hosted deployment free of a database
service.

- **Consequences**: There is no query across tables. The tables list is built by
  reading the saves directory and each `meta.json`. Schema changes must be
  applied to every file at open time, which is why `db.ts` carries `migrate()`
  instead of a migration tool.
