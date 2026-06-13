import { TABLETOPMANCER_HOME } from "$env/static/private";
import { extractZipCodexes } from "$lib/server/codex-zip.js";
import { tableDirName } from "$lib/server/table-dir.js";
import mime from "$lib/mime.js";
import * as cc from "change-case";
import fs from "fs-extra";
import { glob } from "glob";
import path from "node:path";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

const savesDir = path.join(TABLETOPMANCER_HOME, "saves");

type CodexJson = {
  name: string;
  icon: string;
  short_name: string;
  version: string;
};

type CampaignJson = {
  name: string;
  icon: string;
  system: string;
  version: string;
};

export const load: PageServerLoad = async ({ locals, params, url }) => {
  const tablePath = path.join(savesDir, tableDirName(params.id));

  if (!(await fs.pathExists(tablePath))) {
    error(404, "Table not found");
  }

  const codexesDir = path.join(tablePath, "codexes");

  if (!(await fs.pathExists(codexesDir))) {
    return {
      role: locals.role,
      player: locals.player,
      tableId: params.id,
      assets: [],
    };
  }

  // Unpack any zip-packaged codexes so they are loaded like directory codexes.
  await extractZipCodexes(codexesDir);

  const [systemFiles, campaignFiles] = await Promise.all([
    glob(path.join(codexesDir, "*/codex.json"), { nodir: true, follow: true }),
    glob(path.join(codexesDir, "*/campaign.json"), { nodir: true, follow: true }),
  ]);

  const codexes = await Promise.all([
    ...systemFiles.map((file) => loadCodex(file, codexesDir, url.pathname)),
    ...campaignFiles.map((file) => loadCampaign(file, codexesDir, url.pathname)),
  ]);

  const allAssets = await Promise.all(
    codexes.map((codex) => loadCodexAssets(codex, codexesDir, url.pathname)),
  );

  return {
    role: locals.role,
    player: locals.player,
    tableId: params.id,
    assets: allAssets.flat().toSorted((a, b) => a.name.localeCompare(b.name)),
  };
};

async function loadCodexAssets(
  codex: Codex,
  codexesDir: string,
  urlPathname: string,
): Promise<Asset[]> {
  const codexDir = path.join(codexesDir, codex.relativepath);
  const ttmIgnorePatterns = await readTtmIgnore(codexDir);
  const matches = await glob("**/*.{md,png,jpg,jpeg,webp,uvtt,dd2vtt,json}", {
    cwd: codexDir,
    nodir: true,
    follow: true,
    ignore: ["codex.json", "campaign.json", ...ttmIgnorePatterns],
  });

  return Promise.all(
    matches.map(async (file) => {
      const jsonContent =
        path.extname(file) === ".json" ? await readJsonSafe(path.join(codexDir, file)) : null;
      const mimetype = resolveAssetType(file, jsonContent);
      const assetUrl = path.join(urlPathname, "asset", codex.relativepath, file);
      return {
        name: resolveAssetName(file, jsonContent),
        thumbnail: mimetype.match(/^image\//) ? assetUrl : "",
        relativepath: file,
        mimetype,
        codex,
        url: assetUrl,
      };
    }),
  );
}

async function loadCodex(file: string, codexesDir: string, urlPathname: string): Promise<Codex> {
  const raw: Partial<CodexJson> = await fs.readJSON(file, "utf8");
  const dirname = path.dirname(path.relative(codexesDir, file));
  const { name = dirname, short_name = dirname, version = "0", icon } = raw;
  return {
    type: "system",
    name,
    code: `${short_name}@${version}`,
    relativepath: dirname,
    icon: icon ? path.join(urlPathname, "asset", dirname, icon) : undefined,
  } as Codex;
}

async function loadCampaign(file: string, codexesDir: string, urlPathname: string): Promise<Codex> {
  const raw: Partial<CampaignJson> = await fs.readJSON(file, "utf8");
  const dirname = path.dirname(path.relative(codexesDir, file));
  const { name = dirname, version = "0", icon, system } = raw;
  return {
    type: "campaign",
    name,
    code: `${dirname}@${version}`,
    relativepath: dirname,
    system,
    icon: icon ? path.join(urlPathname, "asset", dirname, icon) : undefined,
  } as Codex;
}

function resolveAssetName(
  file: string,
  jsonContent: Record<string, unknown> | null,
): Asset["name"] {
  if (jsonContent && typeof jsonContent.title === "string" && jsonContent.title.trim()) {
    return jsonContent.title.trim();
  }
  return cc.sentenceCase(path.basename(file).slice(0, path.extname(file).length * -1));
}

async function readJsonSafe(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    return await fs.readJSON(filePath, "utf8");
  } catch {
    return null;
  }
}

async function readTtmIgnore(dir: string): Promise<string[]> {
  const ignoreFile = path.join(dir, ".ttmignore");
  if (!(await fs.pathExists(ignoreFile))) return [];
  const content: string = await fs.readFile(ignoreFile, "utf8");
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function isJsonSchema(content: Record<string, unknown>): boolean {
  return "$schema" in content || ("type" in content && "properties" in content);
}

function isSchemaAsset(file: string, jsonContent: Record<string, unknown> | null): boolean {
  return path.extname(file) === ".json" && jsonContent !== null && isJsonSchema(jsonContent);
}

function resolveAssetType(
  file: string,
  jsonContent: Record<string, unknown> | null,
): Asset["mimetype"] {
  if (isSchemaAsset(file, jsonContent)) {
    return "application/schema+json";
  }
  return mime.getType(file) || "text/plain";
}
