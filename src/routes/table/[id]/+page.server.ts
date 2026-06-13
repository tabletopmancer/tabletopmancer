import { TABLETOPMANCER_HOME } from "$env/static/private";
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

// TODO: Add support for *.zip codexes
export const load: PageServerLoad = async ({ locals, params, url }) => {
  // TODO: Encrypt the dir name as uuid
  const tablePath = path.join(savesDir, params.id);

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

  return matches.map((file) => {
    const mimetype = resolveAssetType(file);
    const assetUrl = path.join(urlPathname, "asset", codex.relativepath, file);
    return {
      name: resolveAssetName(file),
      thumbnail: mimetype.match(/^image\//) ? assetUrl : "",
      relativepath: file,
      mimetype,
      codex,
      url: assetUrl,
    };
  });
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

// TODO: For json data, get the name from the schema
function resolveAssetName(file: string): Asset["name"] {
  return cc.sentenceCase(path.basename(file).slice(0, path.extname(file).length * -1));
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

// Determine the correct type for an asset
function resolveAssetType(file: string): Asset["mimetype"] {
  // TODO: Check the content of the json file to detect schemas
  if (path.extname(file) === ".json" && file.includes("schema")) {
    return "application/schema+json";
  }

  return mime.getType(file) || "text/plain";
}
