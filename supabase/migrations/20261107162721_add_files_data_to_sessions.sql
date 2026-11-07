/*
# Add files_data to sessions

1. Modified Tables
- `sessions`: new column `files_data` (jsonb, not null, defaults to an empty array).

2. Purpose
- Stores the homework files a user uploaded (name, MIME type, and base64 contents) so the
  "Edit Homework" screen can show them again. Each element looks like
  { "name": "homework.png", "mimeType": "image/png", "base64": "..." }.

3. Security
- No new policies or grants. The existing sessions policies already restrict every row to its owner,
  and signed-in users already hold table-level access that covers the new column.

4. Notes
- Existing sessions receive an empty array, so no data is changed.
- jsonb stores large values, so base64 file contents fit without truncation.
*/

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS files_data jsonb NOT NULL DEFAULT '[]'::jsonb;
