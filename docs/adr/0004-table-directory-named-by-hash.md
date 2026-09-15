# Table directory named by a hash of the table name

`tableDirName` derives a UUID-shaped directory name from the sha256 of the table
name. The table name is used directly as its ID everywhere else, and is stored
in `meta.json`.

A name can hold characters that are unsafe in a path, and a stored random ID
would need a lookup index over every saves directory. A deterministic hash gives
a safe name and needs no index.

- **Consequences**: A table cannot be renamed — a new name points at a new, empty
  directory. Two tables cannot share a name; `createTable` uses the directory
  test as its uniqueness check.
