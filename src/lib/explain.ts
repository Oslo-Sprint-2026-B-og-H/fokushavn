const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/explain-text`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function explainText(selectedText: string): Promise<string> {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: selectedText }),
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
