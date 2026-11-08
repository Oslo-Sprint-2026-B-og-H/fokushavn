import type { InlineFile } from '@/lib/homeworkFile';
import { supabase } from '@/lib/supabase';

export const MAX_HOMEWORK_CHARS = 5000;

export type StepType = 'action' | 'break';

export type Step = {
  step_number: number;
  text: string;
  est_minutes: number;
  type: StepType;
  hints: string[];
};

export type BilingualStep = {
  step_number: number;
  est_minutes: number;
  type: StepType;
  text_en: string;
  text_no: string;
  hints_en: string[];
  hints_no: string[];
};

export type Breakdown = {
  session_title_en: string;
  session_title_no: string;
  vocabulary_en: VocabularyItem[];
  vocabulary_no: VocabularyItem[];
  steps: BilingualStep[];
};

export type VocabularyItem = {
  word: string;
  definition: string;
};

const MAX_HINTS = 3;
const MAX_VOCABULARY = 5;
const LEVEL_PREFIX = /^level\s*\d+\s*[:.-]\s*/i;
const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/breakdown-homework`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseHints(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((hint): hint is string => typeof hint === 'string')
    .map((hint) => hint.trim().replace(LEVEL_PREFIX, ''))
    .filter((hint) => hint.length > 0)
    .slice(0, MAX_HINTS);
}

export function parseVocabulary(value: unknown): VocabularyItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((item) => ({
      word: typeof item.word === 'string' ? item.word.trim() : '',
      definition: typeof item.definition === 'string' ? item.definition.trim() : '',
    }))
    .filter((item) => item.word.length > 0 && item.definition.length > 0)
    .slice(0, MAX_VOCABULARY);
}

function parseStep(value: unknown, index: number): BilingualStep {
  if (
    !isRecord(value) ||
    typeof value.text_en !== 'string' ||
    typeof value.text_no !== 'string' ||
    typeof value.est_minutes !== 'number' ||
    (value.type !== 'action' && value.type !== 'break')
  ) {
    throw new Error('Invalid step');
  }

  const isBreak = value.type === 'break';
  return {
    step_number: index + 1,
    est_minutes: value.est_minutes,
    type: value.type,
    text_en: value.text_en.trim(),
    text_no: value.text_no.trim(),
    hints_en: isBreak ? [] : parseHints(value.hints_en),
    hints_no: isBreak ? [] : parseHints(value.hints_no),
  };
}

export function parseBreakdown(raw: string): Breakdown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const data: unknown = JSON.parse(cleaned);

  if (
    !isRecord(data) ||
    typeof data.session_title_en !== 'string' ||
    typeof data.session_title_no !== 'string' ||
    !Array.isArray(data.steps) ||
    data.steps.length === 0
  ) {
    throw new Error('Invalid breakdown');
  }

  return {
    session_title_en: data.session_title_en.trim(),
    session_title_no: data.session_title_no.trim(),
    vocabulary_en: parseVocabulary(data.vocabulary_en),
    vocabulary_no: parseVocabulary(data.vocabulary_no),
    steps: data.steps.map(parseStep),
  };
}

export async function breakDownHomework(text: string, files: InlineFile[]): Promise<Breakdown> {
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
    body: JSON.stringify({ text, files }),
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  const payload: unknown = await response.json();
  if (!isRecord(payload) || typeof payload.text !== 'string') {
    throw new Error('Unexpected response');
  }

  return parseBreakdown(payload.text);
}
