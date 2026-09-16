import { execFile, spawn, type ChildProcess } from "node:child_process";
import fs from "fs-extra";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { TestProject } from "vitest/node";

const run = promisify(execFile);

const DM_URL_PATTERN = /DM login URL: (\S+)/;
const SERVER_START_TIMEOUT = 30_000;

async function freePort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as net.AddressInfo;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

function waitForDmLoginUrl(server: ChildProcess): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("server never logged a DM login URL")),
      SERVER_START_TIMEOUT,
    );
    server.stdout?.setEncoding("utf8");
    server.stdout?.on("data", (chunk: string) => {
      const match = chunk.match(DM_URL_PATTERN);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    server.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited with code ${code} before starting`));
    });
  });
}

async function waitForResponse(origin: string): Promise<void> {
  const deadline = Date.now() + SERVER_START_TIMEOUT;
  while (Date.now() < deadline) {
    try {
      await fetch(origin);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`server at ${origin} never answered`);
}

export default async function setup({ provide }: TestProject): Promise<() => Promise<void>> {
  await run("pnpm", ["exec", "vite", "build"], { cwd: process.cwd() });

  const home = await fs.mkdtemp(path.join(os.tmpdir(), "ttm-e2e-"));
  const port = await freePort();
  // SvelteKit marks cookies secure for any host but localhost, and a secure
  // cookie never comes back over plain http.
  const origin = `http://localhost:${port}`;

  const server = spawn(process.execPath, ["build/index.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), ORIGIN: origin, TABLETOPMANCER_HOME: home },
    stdio: ["ignore", "pipe", "inherit"],
  });

  const dmLoginUrl = await waitForDmLoginUrl(server);
  await waitForResponse(origin);

  provide("baseURL", origin);
  provide("dmLoginUrl", dmLoginUrl);

  return async () => {
    server.kill();
    await fs.remove(home);
  };
}

declare module "vitest" {
  interface ProvidedContext {
    baseURL: string;
    dmLoginUrl: string;
  }
}
