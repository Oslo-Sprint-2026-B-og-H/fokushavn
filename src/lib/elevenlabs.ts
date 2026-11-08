import type { Language } from '@/lib/translations';

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;
const TOKEN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-token`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function fetchSpeechAudio(text: string, language: Language): Promise<Blob> {
  const response = await fetch(TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, language }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Speech request failed (${response.status}): ${detail}`);
  }

  return response.blob();
}

export async function fetchConversationToken(): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  const payload: unknown = await response.json();
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('token' in payload) ||
    typeof payload.token !== 'string' ||
    payload.token.length === 0
  ) {
    throw new Error('Unexpected response');
  }

  return payload.token;
}
