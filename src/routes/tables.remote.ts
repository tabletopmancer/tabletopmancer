import { TABLETOPMANCER_HOME } from "$lib/server/config.js";
import { tableDirName } from "$lib/server/table-dir.js";
import { command } from "$app/server";
import { error } from "@sveltejs/kit";
import * as v from "valibot";
import fs from "fs-extra";
import path from "node:path";

const savesDir = path.join(TABLETOPMANCER_HOME, "saves");

export const createTable = command(v.pipe(v.string(), v.trim(), v.minLength(1)), async (name) => {
  const tableDir = path.join(savesDir, tableDirName(name));

  if (await fs.pathExists(tableDir)) {
    error(409, "A table with that name already exists");
  }

  await fs.ensureDir(tableDir);
  await fs.writeJson(path.join(tableDir, "meta.json"), { id: name });

  return name;
});
