# CLAUDE.md

## Package Manager

This project uses **pnpm**. Always use `pnpm` (e.g. `pnpm add`, `pnpm install`, `pnpm run check`) — never `npm` or `yarn`.

## Pull Request Guidelines

When creating a PR that is related to a GitHub issue, always include `Closes #<issue-number>` in the PR description body. This automatically closes the linked issue when the PR is merged.

Example:

```
## Summary
- Brief description of changes

Closes #42
```

## SvelteKit Remote Functions

Prefer remote functions over form actions for server mutations. `remoteFunctions` is already enabled in `svelte.config.js`.

- Remote functions live in plain `*.remote.ts` files (e.g. `tables.remote.ts`) — the `.remote` suffix is required for Vite to proxy the import safely to the browser; do NOT use the `+` prefix (reserved for SvelteKit route files)
- Define mutations with a valibot schema for type-safe input: `command(v.object({ name: v.string() }), async ({ name }) => { ... })`
- Import and call them in `.svelte` files: `import { myCommand } from "./tables.remote.js"`
- Use `error()` from `@sveltejs/kit` inside commands for error responses; `redirect()` is NOT allowed — return a value and call `goto()` on the client instead
- Never use `"unchecked"` — always validate input with valibot
- Only fall back to form actions when progressive enhancement without JS is required
