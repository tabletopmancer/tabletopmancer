# Table directory named by a hash of the table name

`tableDirName` derives the directory from the sha256 of the table name, which is
also the table ID. A name can hold characters unsafe in a path, and a stored
random ID would need an index over every saves directory.

- **Consequences**: A table cannot be renamed — a new name is a new, empty
  directory. Names are unique, and `createTable` uses the directory test as its
  uniqueness check.
