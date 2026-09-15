import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterAll } from "vitest";

// Server modules read TABLETOPMANCER_HOME at import time, so point it at a
// throwaway directory before any test file imports them.
const home = fs.mkdtempSync(path.join(os.tmpdir(), "ttm-integration-"));
process.env.TABLETOPMANCER_HOME = home;

afterAll(async () => {
  await fs.remove(home);
});
