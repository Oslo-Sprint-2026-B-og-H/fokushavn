import { supabase } from '@/lib/supabase';
import type { Language } from '@/lib/translations';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/explain-text`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function explainText(selectedText: string, language: Language): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sign in required');

  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: selectedText, language }),
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  const payload: unknown = await response.json();
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('text' in payload) ||
    typeof payload.text !== 'string' ||
    payload.text.length === 0
  ) {
    throw new Error('Unexpected response');
  }

  return payload.text;
}
