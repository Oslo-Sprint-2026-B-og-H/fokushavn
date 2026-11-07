/*
# Store session content in English and Norwegian

Plain-English summary: each step, session title, and vocabulary list now has an English and a Norwegian version, so switching the app language is instant. Older sessions keep their original text in the existing columns.

1. Modified Tables
- `steps`: new nullable columns `text_en` (text), `text_no` (text), `hints_en` (jsonb, array), `hints_no` (jsonb, array).
- `sessions`: new nullable columns `title_en` (text), `title_no` (text), `vocab_en` (jsonb, array), `vocab_no` (jsonb, array).

2. Removed Permissions
- The on-the-fly translation feature is no longer used, so its UPDATE grants on `steps.text`, `steps.hints`, `sessions.session_title`, and `sessions.vocabulary` are revoked.
- The `update_own_sessions` policy added for that feature is dropped.

3. Security
- No existing rows are changed and no policies are loosened.
- Signed-in users keep their existing insert, select, and delete rights and the progress-only update on steps.

4. Notes
- Legacy columns (`text`, `hints`, `session_title`, `vocabulary`) are kept, and the app falls back to them when a bilingual value is missing.
*/

ALTER TABLE steps ADD COLUMN IF NOT EXISTS text_en text;
ALTER TABLE steps ADD COLUMN IF NOT EXISTS text_no text;
ALTER TABLE steps ADD COLUMN IF NOT EXISTS hints_en jsonb;
ALTER TABLE steps ADD COLUMN IF NOT EXISTS hints_no jsonb;

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS title_en text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS title_no text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS vocab_en jsonb;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS vocab_no jsonb;

REVOKE UPDATE (text, hints) ON steps FROM authenticated;
REVOKE UPDATE (session_title, vocabulary) ON sessions FROM authenticated;
DROP POLICY IF EXISTS "update_own_sessions" ON sessions;
