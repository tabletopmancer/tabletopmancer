import { env } from "$env/dynamic/private";
import os from "node:os";
import path from "node:path";

export const TABLETOPMANCER_HOME =
  env.TABLETOPMANCER_HOME ?? path.join(os.homedir(), ".local", "share", "tabletopmancer");
