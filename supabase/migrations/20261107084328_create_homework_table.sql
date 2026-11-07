/*
# Create homework table

Plain-English summary: adds a place to store the homework text a visitor pastes into Stepwise, along with the time it was saved. Each saved homework item gets its own unique ID.

1. New Tables
- `homework`
  - `id` (uuid, primary key, generated automatically)
  - `content` (text, required) - the pasted homework text
  - `created_at` (timestamptz, defaults to now) - when it was saved

2. Security
- Row level security is enabled on `homework`.
- The app has no sign-in, so every visitor uses the anonymous role. Anonymous and signed-in roles both get read, create, update, and delete access to this table, scoped through policies named per verb.
- Access is intentionally shared: anyone holding the public app key can read every row. Revisit this before adding sign-in or storing sensitive content.

3. Notes
- No existing data is changed or removed.
- Statements are idempotent, so this migration is safe to re-run.
*/

CREATE TABLE IF NOT EXISTS homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE homework ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON homework TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_homework" ON homework;
CREATE POLICY "anon_select_homework" ON homework FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_homework" ON homework;
CREATE POLICY "anon_insert_homework" ON homework FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_homework" ON homework;
CREATE POLICY "anon_update_homework" ON homework FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_homework" ON homework;
CREATE POLICY "anon_delete_homework" ON homework FOR DELETE
  TO anon, authenticated USING (true);
