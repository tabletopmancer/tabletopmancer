import { TABLETOPMANCER_HOME } from "$env/static/private";
import fs from "fs-extra";
import path from "node:path";
import type { PageServerLoad } from "./$types";

const savesDir = path.join(TABLETOPMANCER_HOME, "saves");

export const load: PageServerLoad = async () => {
  const dirs = await fs.readdir(savesDir, { withFileTypes: true });

  const tables = await Promise.all(
    dirs
      .filter((d) => d.isDirectory())
      .map(async (d) => {
        const id = d.name;
        const dbPath = path.join(savesDir, id, "db.sqlite");
        let lastPlayed: Date;
        try {
          const stats = await fs.stat(dbPath);
          lastPlayed = new Date(stats.mtime);
        } catch {
          lastPlayed = new Date(0);
        }
        return { id, name: id, lastPlayed };
      }),
  );

  return { tables };
};
