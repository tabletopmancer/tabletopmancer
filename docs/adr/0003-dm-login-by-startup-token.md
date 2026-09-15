# DM login by a startup token, not an account

There is no user account system. At every server start a random login token is
generated in memory and its URL is printed to the console. Opening that URL
issues a long-lived DM cookie, and the sha256 of that cookie is appended to
`$TABLETOPMANCER_HOME/dm-sessions`.

The product is self-hosted by one DM, so accounts, passwords and a reset flow
would cost more than they protect. Console access is already full access.

- **Consequences**: The login URL changes at every restart, and old DM cookies
  stay valid because they are checked against the file. To revoke a DM session,
  delete its line, or the whole file. The DM role is server-wide, so a single
  server cannot host two DMs who must not see each other's tables.
