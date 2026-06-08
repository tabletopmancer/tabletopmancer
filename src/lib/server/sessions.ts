import { TABLETOPMANCER_HOME } from "$env/static/private";
import fs from "fs-extra";
import path from "node:path";

const savesDir = path.join(TABLETOPMANCER_HOME, "saves");

function sessionsPath(tableId: string): string {
  return path.join(savesDir, tableId, "sessions.json");
}

async function readSessions(tableId: string): Promise<Record<string, string>> {
  try {
    return (await fs.readJSON(sessionsPath(tableId))) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function getSession(tableId: string, token: string): Promise<string | null> {
  const sessions = await readSessions(tableId);
  return sessions[token] ?? null;
}

export async function createSession(
  tableId: string,
  token: string,
  playerId: string,
): Promise<void> {
  const filePath = sessionsPath(tableId);
  await fs.ensureDir(path.dirname(filePath));
  const sessions = await readSessions(tableId);
  sessions[token] = playerId;
  await fs.writeJSON(filePath, sessions, { spaces: 2 });
}
