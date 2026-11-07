/*
# Add hints to steps

Plain-English summary: each step can now store up to three progressive hints that a student reveals one at a time. Break steps store no hints. Older steps saved before this change automatically get an empty list, so they show no hint button.

1. Modified Tables
- `steps`
  - `hints` (jsonb, required, defaults to an empty list). Holds a list of hint text strings in order.

2. Security
- No change to row level security or grants. The existing column-restricted update rule still only allows changing `completed` and `skipped`, so students cannot edit hints.

3. Notes
- No existing data is changed or removed.
- Statements are idempotent, so this migration is safe to re-run.
*/

ALTER TABLE steps ADD COLUMN IF NOT EXISTS hints jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE steps DROP CONSTRAINT IF EXISTS steps_hints_is_array;
ALTER TABLE steps ADD CONSTRAINT steps_hints_is_array CHECK (jsonb_typeof(hints) = 'array');
