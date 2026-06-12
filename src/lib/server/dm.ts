import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";
import { TABLETOPMANCER_HOME } from "$env/static/private";
import fs from "fs-extra";
import crypto from "node:crypto";
import path from "node:path";

// Holds one sha256 hash per line, one for each issued DM session cookie.
// Deleting the file (or a line) revokes the corresponding session.
const sessionsFile = path.join(TABLETOPMANCER_HOME, "dm-sessions");

// Ephemeral login token: regenerated on every server start, never written to disk.
const loginToken = crypto.randomBytes(32).toString("hex");

function sha256(value: string): Buffer {
  return crypto.createHash("sha256").update(value).digest();
}

function equals(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function isLoginToken(value: string): boolean {
  return equals(sha256(value), sha256(loginToken));
}

function readSessionHashes(): Buffer[] {
  try {
    return fs
      .readFileSync(sessionsFile, "utf8")
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => Buffer.from(line, "hex"));
  } catch {
    return [];
  }
}

export function createDmSession(): string {
  const token = crypto.randomBytes(32).toString("hex");
  fs.ensureDirSync(path.dirname(sessionsFile));
  fs.appendFileSync(sessionsFile, `${sha256(token).toString("hex")}\n`, { mode: 0o600 });
  return token;
}

export function isDmSession(value: string | undefined): boolean {
  if (!value) return false;
  const hash = sha256(value);
  return readSessionHashes().some((stored) => equals(stored, hash));
}

export function logDmLoginUrl(): void {
  const port = env.PORT ?? (dev ? "5173" : "3000");
  const origin = env.ORIGIN ?? `http://localhost:${port}`;
  console.log(`[tabletopmancer] DM login URL: ${origin}/dm/${loginToken}`);
}
