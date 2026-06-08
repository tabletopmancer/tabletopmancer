import { TABLETOPMANCER_HOME } from "$env/static/private";
import mime from "$lib/mime.js";
import * as cc from "change-case";
import fs from "fs-extra";
import { glob } from "glob";
import path from "node:path";
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
  // TODO: Check if dir exists
  const tablePath = path.join(savesDir, params.id);

  // TODO: Check if the dir exists
  const codexesDir = path.join(tablePath, "codexes");

  const [systemFiles, campaignFiles] = await Promise.all([
    glob(path.join(codexesDir, "*/codex.json"), { nodir: true, follow: true }),
    glob(path.join(codexesDir, "*/campaign.json"), { nodir: true, follow: true }),
  ]);

  const codexes = await Promise.all([
    ...systemFiles.map((file) => loadCodex(file, codexesDir, url.pathname)),
    ...campaignFiles.map((file) => loadCampaign(file, codexesDir, url.pathname)),
  ]);

  const assets: Asset[] = [];

  for (const codex of codexes) {
    // TODO: Implement .ttmignore file
    const matches = await glob("**/*.{md,png,jpg,jpeg,webp,uvtt,dd2vtt,json}", {
      cwd: path.join(codexesDir, codex.relativepath),
      nodir: true,
      follow: true,
      ignore: ["codex.json", "campaign.json"],
    });

    for (let i = 0, l = matches.length; i < l; i++) {
      const file = matches[i];

      const asset = {
        name: resolveAssetName(file),
        thumbnail: "",
        relativepath: file,
        mimetype: resolveAssetType(file),
        codex,
        url: path.join(url.pathname, "asset", codex.relativepath, file),
      };

      if (asset.mimetype.match(/^image\//)) {
        asset.thumbnail = asset.url;
      }

      assets.push(asset);
    }
  }

  return {
    role: locals.role,
    player: locals.player,
    tableId: params.id,
    assets: assets.toSorted((a, b) => a.name.localeCompare(b.name)),
  };
};

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

// Determine the correct type for an asset
function resolveAssetType(file: string): Asset["mimetype"] {
  // TODO: Check the content of the json file to detect schemas
  if (path.extname(file) === ".json" && file.includes("schema")) {
    return "application/schema+json";
  }

  return mime.getType(file) || "text/plain";
}
