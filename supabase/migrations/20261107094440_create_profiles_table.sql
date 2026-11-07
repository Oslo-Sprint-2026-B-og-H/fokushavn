/*
# Create profiles table to store each user's name

Plain-English summary: every account now has a saved name. When someone signs up, their name is stored in a `profiles` table linked to their account. Email and password stay in Supabase's built-in account store, where passwords are stored only as scrambled (hashed) values and login checks against them.

1. New Tables
- `profiles`
  - `id` (uuid, primary key, same as the account's ID in the built-in account store; removed automatically if the account is deleted)
  - `full_name` (text, required, 1 to 100 characters)
  - `created_at` (timestamptz, defaults to now)

2. Automation
- A trigger creates the `profiles` row at the moment a new account is created, using the name entered on the sign-up form.
- The trigger function is not callable by visitors or signed-in users directly.

3. Security
- Row level security is enabled on `profiles`.
- Signed-in users can read only their own profile row.
- No insert, update, or delete access is granted to app users, so names are set only at sign-up.

4. Notes
- Existing data is not changed or removed.
- Statements are idempotent, so this migration is safe to re-run.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON profiles FROM anon, authenticated;
GRANT SELECT ON profiles TO authenticated;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
