# SvelteKit remote functions for all client-server traffic

Clients call `*.remote.ts` only: `command`, `query`, and `query.live` for the
board stream. This gives one typed call site per operation, valibot validation
on every input, and no separate websocket server — unlike form actions or a
hand-written REST layer.

- **Consequences**: The app needs JavaScript. `remoteFunctions` and the `async`
  compiler option are experimental, so a SvelteKit upgrade can break the
  transport. Each remote function is a public endpoint and repeats its own
  authorization check.
