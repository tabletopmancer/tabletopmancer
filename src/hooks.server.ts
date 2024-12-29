import { error, type Handle } from '@sveltejs/kit'

export const handle: Handle = async ({ event, resolve }) => {
  // Determine the role according to the IP
  event.locals.role = event.getClientAddress() === '127.0.0.1' ? 'DM' : 'PLAYER'

  // Avoid logging to the dashboard
  if (event.locals.role !== 'DM' && event.url.pathname === '/') {
    throw error(401, 'Unauthorized')
  }

  // TODO: Avoid accessing closed table resources

  const response = await resolve(event)

  // TODO: If the player is not registered when accessing the table, create its profile

  return response
}
