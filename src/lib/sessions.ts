import { supabase } from '@/lib/supabase';
import { parseHints, parseVocabulary, type Breakdown, type Step, type VocabularyItem } from '@/lib/breakdown';

export type SavedStep = Step & {
  id: string;
  completed: boolean;
  skipped: boolean;
};

export type SavedSession = {
  id: string;
  session_title: string;
  homework_text: string;
  vocabulary: VocabularyItem[];
  steps: SavedStep[];
};

export type RecentSession = {
  id: string;
  session_title: string;
  created_at: string;
};

export type StepStatus = 'completed' | 'skipped';

const RECENT_LIMIT = 5;
const STEP_COLUMNS = 'id, step_number, text, est_minutes, type, completed, skipped, hints';

type StepRow = Omit<SavedStep, 'hints'> & { hints?: unknown };

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

function isRecentRow(value: unknown): value is RecentSession {
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
      return { ...row, hints: parseHints(row.hints) };
    })
    .sort((a, b) => a.step_number - b.step_number);
}

export async function createSession(homeworkText: string, breakdown: Breakdown): Promise<SavedSession> {
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      homework_text: homeworkText,
      session_title: breakdown.session_title,
      vocabulary: breakdown.vocabulary,
    })
    .select('id')
    .single();

  if (sessionError || !isRecord(session) || typeof session.id !== 'string') {
    throw new Error('Could not save session');
  }

  const stepRows = breakdown.steps.map((step) => ({
    session_id: session.id,
    step_number: step.step_number,
    text: step.text,
    est_minutes: step.est_minutes,
    type: step.type,
    hints: step.hints,
  }));

  const { data: rows, error: stepsError } = await supabase.from('steps').insert(stepRows).select(STEP_COLUMNS);

  if (stepsError || !Array.isArray(rows) || rows.length !== stepRows.length) {
    await supabase.from('sessions').delete().eq('id', session.id);
    throw new Error('Could not save steps');
  }

  return {
    id: session.id,
    session_title: breakdown.session_title,
    homework_text: homeworkText,
    vocabulary: breakdown.vocabulary,
    steps: toSavedSteps(rows),
  };
}

export async function listRecentSessions(): Promise<RecentSession[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, session_title, created_at')
    .order('created_at', { ascending: false })
    .limit(RECENT_LIMIT);

  if (error || !Array.isArray(data) || !data.every(isRecentRow)) {
    throw new Error('Could not load sessions');
  }

  return data;
}

export async function loadSession(sessionId: string): Promise<SavedSession> {
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, session_title, homework_text, vocabulary')
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

  return {
    id: sessionId,
    session_title: session.session_title,
    homework_text: session.homework_text,
    vocabulary: parseVocabulary(session.vocabulary),
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
