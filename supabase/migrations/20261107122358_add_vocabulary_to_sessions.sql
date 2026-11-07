/*
# Add vocabulary to sessions

Plain-English summary: each study session can now store a short list of difficult words from the homework, with a simple definition for each. Existing sessions get an empty list, so nothing is lost.

1. Modified Tables
- `sessions`
  - New column `vocabulary` (jsonb, required, defaults to an empty list). Each entry holds a `word` and a plain-English `definition`.

2. Security
- No change to row level security or grants. Students can already read and insert their own sessions, and the new column is covered by those existing rules.

3. Notes
- Existing rows are not changed other than receiving the empty default.
- Statements are idempotent, so this migration is safe to re-run.
*/

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS vocabulary jsonb NOT NULL DEFAULT '[]'::jsonb;
