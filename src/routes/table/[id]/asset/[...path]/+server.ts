import { TTM_HOME } from '$env/static/private'
import { text } from '@sveltejs/kit'
import fs from 'fs/promises'
import path from 'path'
import type { RequestHandler } from './$types'

const savesDir = path.join(TTM_HOME, 'saves')

export const GET: RequestHandler = async ({ params, request }) => {
  // TODO: Check if the table is pulbic if role is not DM
  // TODO: Check for permissions on certain data
  const file = path.join(savesDir, params.id, 'codexes', params.path)
  const data = await fs.readFile(file, 'utf8')

  // TODO: Handle different mime types
  return text(data)
}
