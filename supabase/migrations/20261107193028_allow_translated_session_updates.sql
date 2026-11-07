/*
# Allow saving translated session content

1. Modified Tables
- `sessions`: signed-in users can now update `session_title` and `vocabulary` on their own sessions.
- `steps`: signed-in users can now update `text` and `hints` on steps of their own sessions.

2. Security
- Column-level UPDATE grants only; `user_id`, `session_id`, and progress columns stay protected.
- New UPDATE policy on `sessions` restricted to the owner, with the same check on both sides.
- Existing `steps` UPDATE policy already limits writes to steps of the user's own sessions.
*/

GRANT UPDATE (session_title, vocabulary) ON sessions TO authenticated;
GRANT UPDATE (text, hints) ON steps TO authenticated;

DROP POLICY IF EXISTS "update_own_sessions" ON sessions;
CREATE POLICY "update_own_sessions" ON sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
