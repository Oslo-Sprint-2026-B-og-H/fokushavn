import type { Translate } from '@/lib/translations';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function formatRelativeDate(isoDate: string, t: Translate, now: Date = new Date()): string {
  const days = Math.round((startOfDay(now) - startOfDay(new Date(isoDate))) / MS_PER_DAY);
  if (days <= 0) return t('today');
  if (days === 1) return t('yesterday');
  return t('daysAgo', { days });
}
