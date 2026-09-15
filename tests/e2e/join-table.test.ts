import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Browser } from "playwright";
import {
  createTable,
  dmPage,
  guestPage,
  launchBrowser,
  openTableToPlayers,
  requestToJoin,
  approvePlayer,
} from "./helpers.js";

let browser: Browser;

beforeAll(async () => {
  browser = await launchBrowser();
});

afterAll(async () => {
  await browser.close();
});

describe("joining a table", () => {
  it("sends the player to the table once the DM approves", async () => {
    const tableId = "ApprovalRun";
    const dm = await dmPage(browser);
    await createTable(dm, tableId);
    await openTableToPlayers(dm);

    const player = await guestPage(browser);
    await requestToJoin(player, tableId, "Alice");

    await approvePlayer(dm, "Alice");

    await player.waitForURL(`**/table/${encodeURIComponent(tableId)}`);
    expect(new URL(player.url()).pathname).toBe(`/table/${encodeURIComponent(tableId)}`);
  });

  it("turns a closed table away", async () => {
    const tableId = "ClosedTable";
    const dm = await dmPage(browser);
    await createTable(dm, tableId);

    const player = await guestPage(browser);
    await player.goto(`/join/${encodeURIComponent(tableId)}`);

    await player.getByText("Table closed").waitFor();
  });
});
