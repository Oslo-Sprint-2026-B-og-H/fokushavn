export const DEFAULT_STEP_MINUTES = 5;
export const LOW_TIME_RATIO = 0.2;

export function stepDurationSeconds(estMinutes: unknown): number {
  if (typeof estMinutes !== 'number' || !Number.isFinite(estMinutes) || estMinutes <= 0) {
    return DEFAULT_STEP_MINUTES * 60;
  }
  return Math.max(1, Math.round(estMinutes * 60));
}

export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
