/*
# Restrict table privileges on sessions and steps

1. Summary
- Removes privileges that were automatically granted to the anonymous and signed-in roles on the `sessions` and `steps` tables.
- Re-grants only what the app uses.

2. Security changes
- `sessions`: revoked everything from `anon` and `authenticated`, then granted SELECT, INSERT, DELETE to `authenticated`. No UPDATE.
- `steps`: revoked everything from `anon` and `authenticated`, then granted SELECT, INSERT to `authenticated`, and UPDATE on only the `completed` and `skipped` columns.
- Row Level Security policies are unchanged.

3. Notes
- No data is changed or deleted.
- The anonymous role has no privileges on either table after this migration.
*/

REVOKE ALL ON sessions FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON sessions TO authenticated;

REVOKE ALL ON steps FROM anon, authenticated;
GRANT SELECT, INSERT ON steps TO authenticated;
GRANT UPDATE (completed, skipped) ON steps TO authenticated;
