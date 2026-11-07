/*
# Create sessions and steps tables

Plain-English summary: stores each homework session a signed-in user creates, along with the step-by-step breakdown Gemini returned for it. Each step records whether the student completed it or skipped it. Users can only see and change their own sessions.

1. New Tables
- `sessions`
  - `id` (uuid, primary key)
  - `user_id` (uuid, owner, defaults to the signed-in user)
  - `homework_text` (text, the pasted homework)
  - `session_title` (text, title produced by the breakdown)
  - `created_at` (timestamptz)
- `steps`
  - `id` (uuid, primary key)
  - `session_id` (uuid, references `sessions`, removed automatically with its session)
  - `step_number` (integer, position in the session, unique per session)
  - `text` (text, the step instruction)
  - `est_minutes` (numeric, estimated minutes)
  - `type` (text, either `action` or `break`)
  - `completed` (boolean, default false)
  - `skipped` (boolean, default false)
  - `created_at` (timestamptz)

2. Security
- Row level security is enabled on both tables.
- Only signed-in users (`authenticated` role) get access. Anonymous visitors get nothing.
- `sessions`: users can read, create, and delete only rows they own.
- `steps`: users can read and create steps only for sessions they own. Users can update only the `completed` and `skipped` columns, and only on their own steps.
- Table-level grants are limited to the verbs the app uses. The `steps` update grant is column-restricted so students cannot rewrite the step text or timing.

3. Notes
- No existing data is changed or removed.
- Statements are idempotent, so this migration is safe to re-run.
*/

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  homework_text text NOT NULL,
  session_title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_created_idx ON sessions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  text text NOT NULL,
  est_minutes numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('action', 'break')),
  completed boolean NOT NULL DEFAULT false,
  skipped boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT steps_session_number_key UNIQUE (session_id, step_number)
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON sessions TO authenticated;
GRANT SELECT, INSERT ON steps TO authenticated;
GRANT UPDATE (completed, skipped) ON steps TO authenticated;

DROP POLICY IF EXISTS "select_own_sessions" ON sessions;
CREATE POLICY "select_own_sessions" ON sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sessions" ON sessions;
CREATE POLICY "insert_own_sessions" ON sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sessions" ON sessions;
CREATE POLICY "delete_own_sessions" ON sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_steps_of_own_sessions" ON steps;
CREATE POLICY "select_steps_of_own_sessions" ON steps FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = steps.session_id AND sessions.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_steps_of_own_sessions" ON steps;
CREATE POLICY "insert_steps_of_own_sessions" ON steps FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = steps.session_id AND sessions.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_steps_of_own_sessions" ON steps;
CREATE POLICY "update_steps_of_own_sessions" ON steps FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = steps.session_id AND sessions.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = steps.session_id AND sessions.user_id = auth.uid())
  );
