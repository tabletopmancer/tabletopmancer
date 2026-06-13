import AdmZip from "adm-zip";
import fs from "fs-extra";
import { glob } from "glob";
import path from "node:path";

/**
 * Marker file written into a directory that was extracted from a `*.zip` codex.
 * It records the source zip's modification time so we can detect when the zip
 * has changed and the directory needs to be re-extracted. The leading dot and
 * lack of a recognised asset extension keep it out of the asset listing.
 */
const MARKER = ".ttm-zip-source";

type Marker = { mtimeMs: number };

/**
 * Extracts every `*.zip` codex found at the top level of `codexesDir` into a
 * sibling directory named after the archive (e.g. `dnd.zip` -> `dnd/`), so the
 * rest of the loader can treat zip codexes exactly like directory codexes.
 *
 * Extraction is cached: a directory is only (re)extracted when it was produced
 * from a zip and the source zip is newer than the last extraction. Directories
 * that were not created by this function are never touched.
 */
export async function extractZipCodexes(codexesDir: string): Promise<void> {
  const zipFiles = await glob("*.zip", { cwd: codexesDir, nodir: true });
  await Promise.all(zipFiles.map((zipFile) => extractZipCodex(codexesDir, zipFile)));
}

async function extractZipCodex(codexesDir: string, zipFile: string): Promise<void> {
  const zipPath = path.join(codexesDir, zipFile);
  const targetDir = path.join(codexesDir, path.basename(zipFile, path.extname(zipFile)));
  const zipStat = await fs.stat(zipPath);

  if (await fs.pathExists(targetDir)) {
    const marker = await readMarker(targetDir);
    // A directory without our marker belongs to the user; never clobber it.
    if (!marker) return;
    // Already extracted and still up to date with the source zip.
    if (marker.mtimeMs >= zipStat.mtimeMs) return;
    await fs.remove(targetDir);
  }

  await fs.ensureDir(targetDir);
  await extractAll(new AdmZip(zipPath), targetDir);
  await fs.writeJSON(path.join(targetDir, MARKER), { mtimeMs: zipStat.mtimeMs } satisfies Marker);
}

async function readMarker(targetDir: string): Promise<Marker | null> {
  try {
    const marker = (await fs.readJSON(path.join(targetDir, MARKER))) as Partial<Marker>;
    return typeof marker?.mtimeMs === "number" ? { mtimeMs: marker.mtimeMs } : null;
  } catch {
    return null;
  }
}

function extractAll(zip: AdmZip, targetDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    zip.extractAllToAsync(targetDir, true, false, (err) => (err ? reject(err) : resolve()));
  });
}
