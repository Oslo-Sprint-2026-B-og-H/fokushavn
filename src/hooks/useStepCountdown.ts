import { useEffect, useState } from 'react';

export function useStepCountdown(durationSeconds: number, running: boolean): number {
  const [remaining, setRemaining] = useState(durationSeconds);

  useEffect(() => {
    if (!running) return;

    const endsAt = Date.now() + durationSeconds * 1000;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) window.clearInterval(id);
    }, 1000);

    return () => window.clearInterval(id);
  }, [running, durationSeconds]);

  return remaining;
}
