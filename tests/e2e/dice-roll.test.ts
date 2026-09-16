import { afterAll, beforeAll, describe, it } from "vitest";
import type { Browser, Page } from "playwright";
import { launchBrowser, tableWithApprovedPlayer } from "./helpers.js";

let browser: Browser;

beforeAll(async () => {
  browser = await launchBrowser();
});

afterAll(async () => {
  await browser.close();
});

function rollHistory(page: Page) {
  return page.getByRole("dialog", { name: "Roll history" });
}

async function openRollHistory(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Toggle roll history" }).first().click();
  await rollHistory(page).waitFor();
}

describe("rolling dice", () => {
  it("shows a player roll in the DM's history", async () => {
    const { dm, player } = await tableWithApprovedPlayer(browser, "Dice Table", "Alice");

    await player.getByRole("button", { name: "Roll 1d20" }).click();

    await openRollHistory(dm);
    await rollHistory(dm).getByText("Alice").waitFor();
    await rollHistory(dm).getByText("1d20").waitFor();
  });

  it("keeps a private DM roll out of the player's history", async () => {
    const { dm, player } = await tableWithApprovedPlayer(browser, "Private Dice Table", "Bob");

    await dm.getByRole("button", { name: "Roll dice" }).click();
    const roller = dm.getByRole("dialog", { name: "Dice roller" });
    await roller.getByRole("textbox", { name: "Custom dice formula" }).fill("3d4");
    await roller.getByRole("button", { name: "Roll custom formula" }).click();

    await openRollHistory(dm);
    await rollHistory(dm).getByText("3d4").waitFor();

    await openRollHistory(player);
    await rollHistory(player).getByText("No rolls yet.").waitFor();
  });
});
