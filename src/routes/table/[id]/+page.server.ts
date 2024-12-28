import { TTM_HOME } from '$env/static/private'
import { glob } from 'glob'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { PageServerLoad } from './$types'

const savesDir = path.join(TTM_HOME, 'saves')

export const load: PageServerLoad = async ({ params }) => {
  // TODO: Encrypt the dir name as uuid
  const tablePath = path.join(savesDir, params.id)

  // Check if dir exists
  if (await fs.stat(tablePath)) {
  }

  // TODO: Add more file types
  // TODO: Implement .ttmignore file
  const matches = await glob(
    path.join(tablePath, 'codexes/**/*.{md,png,dd2vtt,json}'),
    {
      nodir: true,
      follow: true,
    }
  )

  // TODO: Categories all the assets
  const assets = matches
    .map((p) => path.relative(path.join(tablePath, 'codexes'), p))
    .sort((a, b) => a.localeCompare(b))

  return {
    // TODO: Get the role from IP (in hooks)?
    role: 'DM',
    assets,
  }
}
