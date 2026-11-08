import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Resolves the caller's Authorization bearer to a signed-in user.
 *
 * `verify_jwt` only proves the bearer is a valid project JWT, and the public
 * anon key is exactly that, so every function must additionally confirm the
 * token belongs to a real end user before spending paid upstream resources.
 */
export async function getCallerUserId(req: Request): Promise<string | null> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return null;

  // The anon key is a valid project JWT but carries no user, so getUser rejects it.
  const client = createClient(supabaseUrl, anonKey);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
