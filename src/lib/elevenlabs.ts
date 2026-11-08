import { supabase } from '@/lib/supabase';
import type { Language } from '@/lib/translations';

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;
const TOKEN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-token`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function accessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sign in required');
  return token;
}

export async function fetchSpeechAudio(text: string, language: Language): Promise<Blob> {
  const response = await fetch(TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, language }),
  });

  if (!response.ok) {
    throw new Error(`Speech request failed (${response.status})`);
  }

  return response.blob();
}

export async function fetchConversationToken(): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
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
