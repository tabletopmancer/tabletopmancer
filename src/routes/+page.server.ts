import { TTM_HOME } from '$env/static/private'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { PageServerLoad } from './$types'

const savesDir = path.join(TTM_HOME, 'saves')

export const load: PageServerLoad = async () => {
  // Loads the saves from the local dir
  const dirs = await fs.readdir(savesDir, { withFileTypes: true })

  const tables = await Promise.all(
    dirs
      .filter((d) => d.isDirectory())
      .map(async (d) => await loadTableData(path.join(savesDir, d.name)))
  )

  // TODO: Return a promise, async loading
  return { tables }
}

type State = {
  id: string
  name: string
}

// Reads the save dir and return some data
async function loadTableData(fullpath: string) {
  // Load the state.json file
  const state: Partial<State> = JSON.parse(
    await fs.readFile(path.join(fullpath, 'state.json'), { encoding: 'utf8' })
  )

  // TODO: Get the last played time
  const stats = await fs.stat(path.join(fullpath, 'state.json'))

  return {
    id: path.basename(fullpath),
    name: state.name || path.basename(fullpath),
    path: fullpath,
    lastPlayed: new Date(stats.mtime),
  }
}
