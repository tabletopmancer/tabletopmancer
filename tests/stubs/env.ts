/** Stands in for SvelteKit's `$env/dynamic/private` outside a Vite/Kit build. */
export const env: Record<string, string | undefined> = process.env;
