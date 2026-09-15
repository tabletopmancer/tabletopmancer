import { chromium, type Browser, type Page } from "playwright";
import { inject } from "vitest";

export async function launchBrowser(): Promise<Browser> {
  // CHROMIUM_EXECUTABLE lets a sandbox point at a preinstalled browser instead
  // of the one `playwright install` downloads.
  const executablePath = process.env.CHROMIUM_EXECUTABLE;
  // The board renders 3D dice through WebGL, which needs a software renderer
  // in a headless browser.
  const args = ["--enable-unsafe-swiftshader"];
  return chromium.launch(executablePath ? { executablePath, args } : { args });
}

/** A page already carrying the DM session cookie, sitting on the home page. */
export async function dmPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ baseURL: inject("baseURL") });
  const page = await context.newPage();
  await page.goto(inject("dmLoginUrl"));
  await page.waitForURL(`${inject("baseURL")}/`);
  return page;
}

/** A page with no cookies — anyone who has not logged in as DM. */
export async function guestPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ baseURL: inject("baseURL") });
  return context.newPage();
}

export async function createTable(page: Page, name: string): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "New table" }).click();
  await page.getByPlaceholder("Campaign name…").fill(name);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.waitForURL(`**/table/${encodeURIComponent(name)}`);
}

function settingsDialog(dm: Page) {
  return dm.getByRole("dialog", { name: "Settings" });
}

async function openSettingsTab(dm: Page, tab: "General" | "Players" | "History"): Promise<void> {
  await dm.getByRole("button", { name: "Settings" }).click();
  await settingsDialog(dm).getByRole("button", { name: tab, exact: true }).click();
}

async function closeSettings(dm: Page): Promise<void> {
  await settingsDialog(dm).getByRole("button", { name: "Close" }).click();
  await settingsDialog(dm).waitFor({ state: "hidden" });
}

export async function openTableToPlayers(dm: Page): Promise<void> {
  await openSettingsTab(dm, "General");
  const toggle = settingsDialog(dm).getByRole("checkbox");
  if (!(await toggle.isChecked())) await toggle.check();
  await closeSettings(dm);
}

export async function requestToJoin(player: Page, tableId: string, name: string): Promise<void> {
  await player.goto(`/join/${encodeURIComponent(tableId)}`);
  await player.getByLabel("Your name").fill(name);
  await player.getByRole("button", { name: "Request to join" }).click();
  await player.getByText("Waiting room").waitFor();
}

export async function approvePlayer(dm: Page, name: string): Promise<void> {
  await openSettingsTab(dm, "Players");
  const row = settingsDialog(dm).locator("li").filter({ hasText: name });
  await row.getByRole("button", { name: "Approve" }).click();
  await row.getByText("approved").waitFor();
  await closeSettings(dm);
}

/** A DM page on an open table plus an approved player page on the same table. */
export async function tableWithApprovedPlayer(
  browser: Browser,
  tableId: string,
  playerName: string,
): Promise<{ dm: Page; player: Page }> {
  const dm = await dmPage(browser);
  await createTable(dm, tableId);
  await openTableToPlayers(dm);

  const player = await guestPage(browser);
  await requestToJoin(player, tableId, playerName);
  await approvePlayer(dm, playerName);
  await player.waitForURL(`**/table/${encodeURIComponent(tableId)}`);

  return { dm, player };
}
