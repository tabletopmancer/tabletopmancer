import AdmZip from "adm-zip";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { extractZipCodexes } from "./codex-zip.js";

let codexesDir: string;

beforeEach(async () => {
  codexesDir = await fs.mkdtemp(path.join(os.tmpdir(), "ttm-codex-zip-"));
});

afterEach(async () => {
  await fs.remove(codexesDir);
});

function writeZip(name: string, entries: Record<string, string>): string {
  const zip = new AdmZip();
  for (const [entry, content] of Object.entries(entries)) {
    zip.addFile(entry, Buffer.from(content));
  }
  const zipPath = path.join(codexesDir, name);
  zip.writeZip(zipPath);
  return zipPath;
}

describe("extractZipCodexes", () => {
  it("extracts a zip codex into a directory named after the archive", async () => {
    writeZip("dnd.zip", {
      "codex.json": '{"name":"D&D"}',
      "maps/town.png": "image-bytes",
    });

    await extractZipCodexes(codexesDir);

    expect(await fs.readJSON(path.join(codexesDir, "dnd", "codex.json"))).toEqual({ name: "D&D" });
    expect(await fs.readFile(path.join(codexesDir, "dnd", "maps", "town.png"), "utf8")).toBe(
      "image-bytes",
    );
  });

  it("does nothing when there are no zip codexes", async () => {
    await fs.outputFile(path.join(codexesDir, "manual", "codex.json"), "{}");

    await extractZipCodexes(codexesDir);

    expect(await fs.readdir(codexesDir)).toEqual(["manual"]);
  });

  it("re-extracts only when the zip is newer than the last extraction", async () => {
    writeZip("dnd.zip", { "codex.json": '{"version":"1"}' });
    await extractZipCodexes(codexesDir);

    // A second pass with an unchanged zip must not overwrite local edits.
    const extracted = path.join(codexesDir, "dnd", "codex.json");
    await fs.writeFile(extracted, '{"version":"edited"}');
    await extractZipCodexes(codexesDir);
    expect(await fs.readFile(extracted, "utf8")).toBe('{"version":"edited"}');

    // Replacing the zip with a newer one triggers a fresh extraction.
    const zipPath = writeZip("dnd.zip", { "codex.json": '{"version":"2"}' });
    await fs.utimes(zipPath, new Date(), new Date(Date.now() + 10_000));
    await extractZipCodexes(codexesDir);
    expect(await fs.readJSON(extracted)).toEqual({ version: "2" });
  });

  it("never clobbers a directory it did not create", async () => {
    const userCodex = path.join(codexesDir, "dnd", "codex.json");
    await fs.outputFile(userCodex, '{"name":"user"}');
    writeZip("dnd.zip", { "codex.json": '{"name":"zip"}' });

    await extractZipCodexes(codexesDir);

    expect(await fs.readJSON(userCodex)).toEqual({ name: "user" });
  });
});
