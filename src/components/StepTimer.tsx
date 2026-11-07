import { useEffect, type CSSProperties } from 'react';
import { useStepCountdown } from '@/hooks/useStepCountdown';
import { formatCountdown, LOW_TIME_RATIO } from '@/lib/stepTimer';

type StepTimerProps = {
  durationSeconds: number;
  running: boolean;
};

const FILL_BLUE = '#4A90D9';
const FILL_AMBER = '#E8A33D';
const TIME_UP_TITLE = "⏰ Time's up — Stepwise";

function StepTimer({ durationSeconds, running }: StepTimerProps) {
  const remaining = useStepCountdown(durationSeconds, running);
  const isDone = remaining === 0;
  const isLow = remaining <= durationSeconds * LOW_TIME_RATIO;

  useEffect(() => {
    if (!isDone) return;

    const originalTitle = document.title;
    function syncTitle() {
      document.title = document.hidden ? TIME_UP_TITLE : originalTitle;
    }

    syncTitle();
    document.addEventListener('visibilitychange', syncTitle);
    return () => {
      document.removeEventListener('visibilitychange', syncTitle);
      document.title = originalTitle;
    };
  }, [isDone]);

  const diskStyle = {
    '--timer-angle': `${(remaining / durationSeconds) * 360}deg`,
    '--timer-fill': isLow ? FILL_AMBER : FILL_BLUE,
  } as CSSProperties;

  return (
    <div className="relative flex flex-col items-center">
      <div
        className="step-timer-disk flex h-[104px] w-[104px] items-center justify-center rounded-full"
        style={diskStyle}
      >
        <span className="text-[22px] font-bold tabular-nums leading-none text-ink">
          {formatCountdown(remaining)}
        </span>
      </div>
      <p aria-live="polite" className="absolute right-0 top-full mt-2 w-56 text-right text-sm text-ink/70">
        {isDone ? "Time's up — finish this step or take a break." : null}
      </p>
    </div>
  );
}

export default StepTimer;
