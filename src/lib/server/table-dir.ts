import { createHash } from "node:crypto";

/** Returns a deterministic UUID-format directory name for a table ID. */
export function tableDirName(tableId: string): string {
  const h = createHash("sha256").update(tableId).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
