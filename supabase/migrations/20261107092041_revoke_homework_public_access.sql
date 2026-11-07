/*
# Revoke public access to the unused homework table

1. Summary
- The app no longer reads or writes the `homework` table; sessions and steps replaced it.
- Removes all table privileges from the anonymous and signed-in roles so visitors can no longer read, change, or delete rows through the public key.

2. Notes
- No data is changed or deleted. The table and its rows are kept.
*/

REVOKE ALL ON homework FROM anon, authenticated;
