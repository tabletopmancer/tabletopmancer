import { getDb } from "$lib/server/db.js";

export async function getSession(tableId: string, token: string): Promise<string | null> {
  const row = getDb(tableId)
    .prepare("SELECT player_id FROM sessions WHERE token = ?")
    .get(token) as any;
  return (row?.player_id as string) ?? null;
}

export async function createSession(
  tableId: string,
  token: string,
  playerId: string,
): Promise<void> {
  getDb(tableId)
    .prepare("INSERT OR REPLACE INTO sessions (token, player_id) VALUES (?, ?)")
    .run(token, playerId);
}
