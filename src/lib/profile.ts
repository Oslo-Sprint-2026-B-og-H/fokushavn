import { supabase } from '@/lib/supabase';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function loadFullName(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error('Could not load profile');
  if (!isRecord(data) || typeof data.full_name !== 'string') return null;
  return data.full_name;
}
