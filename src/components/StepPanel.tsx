import { useState } from 'react';
import { Check } from 'lucide-react';
import StepTimer from '@/components/StepTimer';
import StepBody from '@/components/StepBody';
import HighlightExplainer from '@/components/HighlightExplainer';
import type { SavedStep } from '@/lib/sessions';
import { stepDurationSeconds } from '@/lib/stepTimer';

type StepPanelProps = {
  step: SavedStep;
  stepNumber: number;
  total: number;
  isFlashing: boolean;
  timerRunning: boolean;
  toastVisible: boolean;
  onPrimary: () => void;
  onSkip: () => void;
};

function StepPanel({
  step,
  stepNumber,
  total,
  isFlashing,
  timerRunning,
  toastVisible,
  onPrimary,
  onSkip,
}: StepPanelProps) {
  const [revealedHints, setRevealedHints] = useState(0);
  const isBreak = step.type === 'break';
  const hints = step.hints;
  const hasMoreHints = revealedHints < hints.length;

  let primaryLabel = isBreak ? 'Finish Break' : 'Mark as Complete';
  if (isFlashing) primaryLabel = 'Completed';

  return (
    <section className="flex min-h-[460px] flex-col rounded-2xl border border-ink/10 bg-white p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm font-medium text-ink/60">
            Step {stepNumber} of {total}
          </p>
          {isBreak ? (
            <span className="rounded-full bg-[#F3F3F3] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink/70">
              Break
            </span>
          ) : null}
        </div>
        <StepTimer durationSeconds={stepDurationSeconds(step.est_minutes)} running={timerRunning} />
      </div>

      <div className="flex flex-1 flex-col justify-center gap-6 py-10">
        <HighlightExplainer>
          <StepBody text={step.text} />
        </HighlightExplainer>

        <div className="flex w-full flex-col gap-3">
          {hints.slice(0, revealedHints).map((hint, hintIndex) => (
            <p
              key={hintIndex}
              className="animate-fade-in-quick w-full rounded-xl bg-[#F3F3F3] p-4 text-base leading-[1.5] text-ink/70"
            >
              {hint}
            </p>
          ))}
          {hasMoreHints ? (
            <button
              type="button"
              onClick={() => setRevealedHints((count) => count + 1)}
              className="text-sm font-medium text-ink/60 underline-offset-4 transition-colors hover:text-ink hover:underline focus:outline-none focus-visible:underline"
            >
              Show Hint {revealedHints + 1}
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex h-8 items-center justify-center">
        {toastVisible ? (
          <p
            role="status"
            className="animate-fade-in-quick rounded-full bg-ink/5 px-3 py-1 text-sm text-ink/70"
          >
            Step skipped
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={onPrimary}
          className={`inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl text-lg font-semibold shadow-sm transition-colors duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30 ${
            isFlashing ? 'bg-success text-ink' : 'bg-accent text-white hover:opacity-90'
          }`}
        >
          {isFlashing ? <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" /> : null}
          {primaryLabel}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-ink/60 underline-offset-4 transition-colors hover:text-ink hover:underline focus:outline-none focus-visible:underline"
        >
          Skip this step
        </button>
      </div>
    </section>
  );
}

export default StepPanel;
