# DM login by a startup token, not an account

At every start the server prints a login URL holding a random in-memory token.
Opening it issues a long-lived DM cookie whose sha256 is appended to
`$TABLETOPMANCER_HOME/dm-sessions`. The product is self-hosted by one DM, and
console access is already full access, so accounts and a reset flow would cost
more than they protect.

- **Consequences**: The login URL changes at every restart, while issued cookies
  stay valid. Revoke by deleting a line, or the file. One server cannot host two
  DMs who must not see each other's tables.
