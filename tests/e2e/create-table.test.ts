import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Browser } from "playwright";
import { createTable, dmPage, launchBrowser } from "./helpers.js";

let browser: Browser;

beforeAll(async () => {
  browser = await launchBrowser();
});

afterAll(async () => {
  await browser.close();
});

describe("creating a table", () => {
  it("opens the new table and lists it on the home page", async () => {
    const page = await dmPage(browser);
    const name = "Curse of Strahd";

    await createTable(page, name);
    expect(new URL(page.url()).pathname).toBe(`/table/${encodeURIComponent(name)}`);

    await page.goto("/");
    await page.getByText(name).waitFor();
  });

  it("refuses a duplicate name", async () => {
    const page = await dmPage(browser);
    const name = "Duplicate Table";

    await createTable(page, name);

    await page.goto("/");
    await page.getByRole("button", { name: "New table" }).click();
    await page.getByPlaceholder("Campaign name…").fill(name);
    await page.getByRole("button", { name: "Create", exact: true }).click();

    await page.getByText("A table with that name already exists").waitFor();
  });
});
