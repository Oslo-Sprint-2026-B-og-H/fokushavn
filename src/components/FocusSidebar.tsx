import { useState } from 'react';
import { BookOpen, Check, CircleHelp } from 'lucide-react';
import ProgressBar from '@/components/ProgressBar';
import type { SavedStep, StepStatus } from '@/lib/sessions';
import { classifyStep, parseStepContent } from '@/lib/stepContent';

type FocusSidebarProps = {
  title: string;
  steps: SavedStep[];
  statuses: Record<string, StepStatus | undefined>;
  currentIndex: number;
  percent: number;
  poppedId: string | null;
  onJump: (index: number) => void;
  onCheck: (stepId: string) => void;
  onSave: () => void;
  onEditHomework: () => void;
  saving: boolean;
};

function FocusSidebar({
  title,
  steps,
  statuses,
  currentIndex,
  percent,
  poppedId,
  onJump,
  onCheck,
  onSave,
  onEditHomework,
  saving,
}: FocusSidebarProps) {
  const [stepsOpen, setStepsOpen] = useState(false);
  const roundedPercent = Math.round(percent);

  return (
    <aside className="flex flex-col rounded-2xl border border-ink/10 bg-white md:w-[300px] md:shrink-0">
      <div className="flex flex-col gap-5 p-6">
        <div>
          <h2 className="text-xl font-bold leading-[1.2] text-ink">Your Homework</h2>
          <p className="mt-1 break-words text-sm leading-[1.5] text-ink/60">{title}</p>
        </div>

        <div className="flex flex-col gap-2">
          <ProgressBar percent={percent} tone="success" thick />
          <p className="text-sm font-bold tabular-nums text-[#2E8B57]">{roundedPercent}% Complete</p>
        </div>

        <button
          type="button"
          onClick={() => setStepsOpen((open) => !open)}
          aria-expanded={stepsOpen}
          className="flex items-center justify-between text-sm font-medium text-ink/70 transition-colors hover:text-ink focus:outline-none focus-visible:underline md:hidden"
        >
          {stepsOpen ? 'Hide all steps' : `Show all steps (${steps.length})`}
          <span aria-hidden="true">{stepsOpen ? '−' : '+'}</span>
        </button>
      </div>

      <ol
        className={`${stepsOpen ? 'block' : 'hidden'} flex-col gap-1 border-t border-ink/10 p-3 md:flex md:flex-1`}
      >
        {steps.map((step, index) => {
          const status = statuses[step.id];
          const isCompleted = status === 'completed';
          const isCurrent = index === currentIndex;
          const isBreak = step.type === 'break';
          const kind = classifyStep(step.type, parseStepContent(step.text));

          return (
            <li
              key={step.id}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-colors ${
                isCurrent ? 'bg-[#FDF6E3]' : 'bg-white'
              }`}
            >
              <button
                type="button"
                onClick={() => onJump(index)}
                aria-current={isCurrent ? 'step' : undefined}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
              >
                {isBreak ? (
                  <span className="shrink-0 rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink/60">
                    Break
                  </span>
                ) : (
                  <span className="flex w-12 shrink-0 items-center gap-1.5 text-sm tabular-nums text-ink/60">
                    {index + 1}
                    {kind === 'reading' ? (
                      <>
                        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="sr-only">Reading</span>
                      </>
                    ) : null}
                    {kind === 'question' ? (
                      <>
                        <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="sr-only">Question</span>
                      </>
                    ) : null}
                  </span>
                )}
                <span
                  className={`min-w-0 flex-1 truncate text-sm ${
                    isCompleted ? 'text-ink/50' : 'text-ink'
                  } ${isCurrent ? 'font-bold' : 'font-normal'}`}
                >
                  {step.text}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onCheck(step.id)}
                disabled={isCompleted}
                aria-label={isCompleted ? `${step.text} is complete` : `Mark "${step.text}" complete`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30 disabled:cursor-default"
              >
                {isCompleted ? (
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full bg-success text-white ${
                      poppedId === step.id ? 'animate-check-pop' : ''
                    }`}
                  >
                    <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                  </span>
                ) : (
                  <span className="h-6 w-6 rounded-full border-2 border-ink/25 transition-colors hover:border-success" />
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-auto flex flex-col gap-3 border-t border-ink/10 p-6">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="w-full rounded-xl bg-accent px-4 py-3 text-base font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Session'}
        </button>
        <button
          type="button"
          onClick={onEditHomework}
          disabled={saving}
          className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-base font-semibold text-ink transition-colors hover:bg-ink/5 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Edit Homework
        </button>
      </div>
    </aside>
  );
}

export default FocusSidebar;
