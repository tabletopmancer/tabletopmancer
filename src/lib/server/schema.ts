export const SCHEMA = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS tokens (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    image_url TEXT,
    owner TEXT,
    size REAL
  );

  CREATE TABLE IF NOT EXISTS maps (
    id TEXT PRIMARY KEY,
    asset_url TEXT NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fog_patches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    map_id TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
    mode TEXT NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    radius REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rolls (
    id TEXT PRIMARY KEY,
    player TEXT NOT NULL,
    formula TEXT NOT NULL,
    dice TEXT NOT NULL,
    modifier INTEGER NOT NULL,
    total INTEGER NOT NULL,
    private INTEGER NOT NULL,
    timestamp INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS initiative (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    active INTEGER NOT NULL,
    entries TEXT NOT NULL,
    turn INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS board_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    player_id TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS event_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );
`;
