# SvelteKit remote functions for all client-server traffic

Clients talk to the server only through `*.remote.ts` files: `command` for
mutations, `query` for reads, and `query.live` generators for the board stream
and the join screen. Form actions and a hand-written REST or websocket layer
were the alternatives.

Remote functions give one typed call site per operation, and valibot validates
the input, so no endpoint takes unchecked JSON. The live generator removes the
need for a separate websocket server.

- **Status**: `accepted`
- **Consequences**: The app needs JavaScript; progressive enhancement is lost.
  `remoteFunctions` and the `async` compiler option are experimental, so a
  SvelteKit upgrade can break the transport. A remote function is a public
  endpoint, so each one repeats its own authorization check.
