import { TABLETOPMANCER_HOME } from "$lib/server/config.js";
import fs from "fs-extra";
import path from "node:path";
import type { PageServerLoad } from "./$types";

const savesDir = path.join(TABLETOPMANCER_HOME, "saves");

export const load: PageServerLoad = async () => {
  const dirs = await fs.readdir(savesDir, { withFileTypes: true });

  const tables = (
    await Promise.all(
      dirs
        .filter((d) => d.isDirectory())
        .map(async (d) => {
          const dirPath = path.join(savesDir, d.name);
          const dbPath = path.join(dirPath, "db.sqlite");
          const metaPath = path.join(dirPath, "meta.json");

          const meta: { id?: string } = (await fs.readJson(metaPath).catch(() => ({}))) as {
            id?: string;
          };
          const id = meta.id;
          if (!id) return null;

          let lastPlayed: Date;
          try {
            const stats = await fs.stat(dbPath);
            lastPlayed = new Date(stats.mtime);
          } catch {
            lastPlayed = new Date(0);
          }
          return { id, name: id, lastPlayed };
        }),
    )
  )
    .filter((t) => t !== null)
    .toSorted((a, b) => b.lastPlayed.getTime() - a.lastPlayed.getTime());

  return { tables };
};
