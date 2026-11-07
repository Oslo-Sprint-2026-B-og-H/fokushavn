import { supabase } from '@/lib/supabase';
import { parseHints, parseVocabulary, type Breakdown, type Step, type VocabularyItem } from '@/lib/breakdown';
import { parseStoredFiles, type StoredFile } from '@/lib/homeworkFile';
import type { Language } from '@/lib/translations';

export type SavedStep = Step & {
  id: string;
  completed: boolean;
  skipped: boolean;
  text_en: string;
  text_no: string;
  hints_en: string[];
  hints_no: string[];
};

export type SavedSession = {
  id: string;
  homework_text: string;
  files: StoredFile[];
  session_title_en: string;
  session_title_no: string;
  vocab_en: VocabularyItem[];
  vocab_no: VocabularyItem[];
  steps: SavedStep[];
};

export type LocalizedSession = Pick<SavedSession, 'id' | 'homework_text' | 'files' | 'steps'> & {
  session_title: string;
  vocabulary: VocabularyItem[];
};

export type RecentSession = {
  id: string;
  session_title_en: string;
  session_title_no: string;
  created_at: string;
};

export type StepStatus = 'completed' | 'skipped';

const RECENT_LIMIT = 50;
const STEP_COLUMNS =
  'id, step_number, text, est_minutes, type, completed, skipped, hints, text_en, text_no, hints_en, hints_no';
const SESSION_COLUMNS = 'id, session_title, homework_text, vocabulary, files_data, title_en, title_no, vocab_en, vocab_no';

type StepRow = {
  id: string;
  step_number: number;
  text: string;
  est_minutes: number;
  type: Step['type'];
  completed: boolean;
  skipped: boolean;
  hints?: unknown;
  text_en?: unknown;
  text_no?: unknown;
  hints_en?: unknown;
  hints_no?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStepRow(value: unknown): value is StepRow {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.step_number === 'number' &&
    typeof value.text === 'string' &&
    typeof value.est_minutes === 'number' &&
    (value.type === 'action' || value.type === 'break') &&
    typeof value.completed === 'boolean' &&
    typeof value.skipped === 'boolean'
  );
}

function isRecentRow(value: unknown): value is { id: string; session_title: string; title_en: unknown; title_no: unknown; created_at: string } {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.session_title === 'string' &&
    typeof value.created_at === 'string'
  );
}

function toSavedSteps(rows: unknown[]): SavedStep[] {
  return rows
    .map((row) => {
      if (!isStepRow(row)) throw new Error('Unexpected step data');
      const textEn = typeof row.text_en === 'string' ? row.text_en : row.text;
      const textNo = typeof row.text_no === 'string' ? row.text_no : row.text;
      const hintsEn = parseHints(row.hints_en ?? row.hints);
      const hintsNo = parseHints(row.hints_no ?? row.hints);
      return {
        ...row,
        text: textEn,
        hints: hintsEn,
        text_en: textEn,
        text_no: textNo,
        hints_en: hintsEn,
        hints_no: hintsNo,
      };
    })
    .sort((a, b) => a.step_number - b.step_number);
}

export async function createSession(
  homeworkText: string,
  breakdown: Breakdown,
  files: StoredFile[],
): Promise<SavedSession> {
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      homework_text: homeworkText,
      session_title: breakdown.session_title_en,
      vocabulary: breakdown.vocabulary_en,
      title_en: breakdown.session_title_en,
      title_no: breakdown.session_title_no,
      vocab_en: breakdown.vocabulary_en,
      vocab_no: breakdown.vocabulary_no,
      files_data: files,
    })
    .select('id')
    .single();

  if (sessionError || !isRecord(session) || typeof session.id !== 'string') {
    throw new Error('Could not save session');
  }

  const stepRows = breakdown.steps.map((step) => ({
    session_id: session.id,
    step_number: step.step_number,
    text: step.text_en,
    est_minutes: step.est_minutes,
    type: step.type,
    hints: step.hints_en,
    text_en: step.text_en,
    text_no: step.text_no,
    hints_en: step.hints_en,
    hints_no: step.hints_no,
  }));

  const { data: rows, error: stepsError } = await supabase.from('steps').insert(stepRows).select(STEP_COLUMNS);

  if (stepsError || !Array.isArray(rows) || rows.length !== stepRows.length) {
    await supabase.from('sessions').delete().eq('id', session.id);
    throw new Error('Could not save steps');
  }

  return {
    id: session.id,
    homework_text: homeworkText,
    files,
    session_title_en: breakdown.session_title_en,
    session_title_no: breakdown.session_title_no,
    vocab_en: breakdown.vocabulary_en,
    vocab_no: breakdown.vocabulary_no,
    steps: toSavedSteps(rows),
  };
}

export function localizeSession(session: SavedSession, language: Language): LocalizedSession {
  const isNorwegian = language === 'no';
  return {
    id: session.id,
    homework_text: session.homework_text,
    files: session.files,
    session_title: isNorwegian ? session.session_title_no : session.session_title_en,
    vocabulary: isNorwegian ? session.vocab_no : session.vocab_en,
    steps: session.steps.map((step) => ({
      ...step,
      text: isNorwegian ? step.text_no : step.text_en,
      hints: isNorwegian ? step.hints_no : step.hints_en,
    })),
  };
}

export async function listRecentSessions(): Promise<RecentSession[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, session_title, title_en, title_no, created_at')
    .order('created_at', { ascending: false })
    .limit(RECENT_LIMIT);

  if (error || !Array.isArray(data) || !data.every(isRecentRow)) {
    throw new Error('Could not load sessions');
  }

  return data.map((row) => ({
    id: row.id,
    session_title_en: typeof row.title_en === 'string' ? row.title_en : row.session_title,
    session_title_no: typeof row.title_no === 'string' ? row.title_no : row.session_title,
    created_at: row.created_at,
  }));
}

export async function loadSession(sessionId: string): Promise<SavedSession> {
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select(SESSION_COLUMNS)
    .eq('id', sessionId)
    .maybeSingle();

  const { data: rows, error: stepsError } = await supabase
    .from('steps')
    .select(STEP_COLUMNS)
    .eq('session_id', sessionId)
    .order('step_number', { ascending: true });

  if (
    sessionError ||
    stepsError ||
    !isRecord(session) ||
    typeof session.session_title !== 'string' ||
    typeof session.homework_text !== 'string' ||
    !Array.isArray(rows)
  ) {
    throw new Error('Could not load session');
  }

  const titleEn = typeof session.title_en === 'string' ? session.title_en : session.session_title;
  const titleNo = typeof session.title_no === 'string' ? session.title_no : session.session_title;

  return {
    id: sessionId,
    homework_text: session.homework_text,
    files: parseStoredFiles(session.files_data),
    session_title_en: titleEn,
    session_title_no: titleNo,
    vocab_en: parseVocabulary(session.vocab_en ?? session.vocabulary),
    vocab_no: parseVocabulary(session.vocab_no ?? session.vocabulary),
    steps: toSavedSteps(rows),
  };
}

export async function markStep(stepId: string, status: StepStatus): Promise<void> {
  const change = status === 'completed' ? { completed: true } : { skipped: true };
  const { error } = await supabase.from('steps').update(change).eq('id', stepId);
  if (error) throw new Error('Could not save step');
}

export async function saveSessionProgress(
  steps: SavedStep[],
  statuses: Record<string, StepStatus | undefined>,
): Promise<void> {
  const results = await Promise.all(
    steps.map((step) => {
      const status = statuses[step.id];
      return supabase
        .from('steps')
        .update({ completed: status === 'completed', skipped: status === 'skipped' })
        .eq('id', step.id);
    }),
  );
  if (results.some(({ error }) => error)) throw new Error('Could not save progress');
}
