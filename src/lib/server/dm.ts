import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";
import { TABLETOPMANCER_HOME } from "$env/static/private";
import fs from "fs-extra";
import crypto from "node:crypto";
import path from "node:path";

const secretFile = path.join(TABLETOPMANCER_HOME, "dm-secret");

function loadOrCreateSecret(): string {
  try {
    const existing = fs.readFileSync(secretFile, "utf8").trim();
    if (existing) return existing;
  } catch {
    // first run — generate below
  }
  const secret = crypto.randomBytes(32).toString("hex");
  fs.outputFileSync(secretFile, `${secret}\n`, { mode: 0o600 });
  return secret;
}

const dmSecret = loadOrCreateSecret();

function sha256(value: string): Buffer {
  return crypto.createHash("sha256").update(value).digest();
}

export function isDmSecret(value: string | undefined): boolean {
  if (!value) return false;
  return crypto.timingSafeEqual(sha256(value), sha256(dmSecret));
}

export function logDmLoginUrl(): void {
  const port = env.PORT ?? (dev ? "5173" : "3000");
  const origin = env.ORIGIN ?? `http://localhost:${port}`;
  console.log(`[tabletopmancer] DM login URL: ${origin}/dm/${dmSecret}`);
}
