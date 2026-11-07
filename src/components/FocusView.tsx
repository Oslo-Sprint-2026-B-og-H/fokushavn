import { useEffect, useRef, useState } from 'react';
import FocusSidebar from '@/components/FocusSidebar';
import LeaveConfirmDialog from '@/components/LeaveConfirmDialog';
import StepPanel from '@/components/StepPanel';
import VocabularyHelp from '@/components/VocabularyHelp';
import { useWakeLock } from '@/hooks/useWakeLock';
import { isPrimaryShortcut } from '@/lib/shortcuts';
import { saveSessionProgress, type SavedSession, type SavedStep, type StepStatus } from '@/lib/sessions';

type FocusViewProps = {
  session: SavedSession;
  startIndex: number;
  onStepUpdate: (stepId: string, status: StepStatus) => Promise<void>;
  onLeave: () => void;
  onFinish: (completedSteps: number) => void;
  onSaved: () => void;
  onEditHomework: () => void;
};

type Phase = 'idle' | 'flashing' | 'leaving' | 'finishing';
type StatusMap = Record<string, StepStatus | undefined>;

const FLASH_MS = 600;
const FADE_MS = 200;
const FINISH_HOLD_MS = 700;
const TOAST_MS = 2000;

function EmptySteps({ onBack }: { onBack: () => void }) {
  return (
    <div className="animate-fade-in">
      <p className="text-lg leading-[1.5] text-ink">
        No steps found — try again with the original homework.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-6 text-sm font-medium text-accent transition-opacity hover:opacity-80 focus:outline-none focus-visible:underline"
      >
        ← Back
      </button>
    </div>
  );
}

function initialStatuses(steps: SavedStep[]): StatusMap {
  const statuses: StatusMap = {};
  for (const step of steps) {
    if (step.completed) statuses[step.id] = 'completed';
    else if (step.skipped) statuses[step.id] = 'skipped';
  }
  return statuses;
}

function countCompleted(statuses: StatusMap): number {
  return Object.values(statuses).filter((status) => status === 'completed').length;
}

function FocusSession({
  session,
  startIndex,
  onStepUpdate,
  onLeave,
  onFinish,
  onSaved,
  onEditHomework,
}: FocusViewProps) {
  const { steps, session_title: title } = session;
  const total = steps.length;

  const [index, setIndex] = useState(startIndex);
  const [statuses, setStatuses] = useState<StatusMap>(() => initialStatuses(steps));
  const [poppedId, setPoppedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toastKey, setToastKey] = useState<number | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<number | null>(null);
  useWakeLock();

  const step = steps[index];
  const isLast = index === total - 1;
  const hasVocabulary = session.vocabulary.length > 0;
  const isFinishing = phase === 'finishing';
  const isFlashing = phase === 'flashing';
  const completedCount = countCompleted(statuses);
  const percent = isFinishing ? 100 : (completedCount / total) * 100;

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (toastKey === null) return;
    const id = window.setTimeout(() => setToastKey(null), TOAST_MS);
    return () => window.clearTimeout(id);
  }, [toastKey]);

  function later(callback: () => void, delay: number) {
    timerRef.current = window.setTimeout(callback, delay);
  }

  function moveOn(completedAfter: number) {
    if (isLast) {
      setPhase('finishing');
      later(() => onFinish(completedAfter), FINISH_HOLD_MS);
      return;
    }
    setPhase('leaving');
    later(() => {
      setIndex((current) => current + 1);
      setPhase('idle');
    }, FADE_MS);
  }

  function recordStep(stepId: string, status: StepStatus) {
    onStepUpdate(stepId, status).then(
      () => setSaveFailed(false),
      () => setSaveFailed(true),
    );
  }

  function markComplete(stepId: string): boolean {
    if (statuses[stepId] === 'completed') return false;
    setStatuses((current) => ({ ...current, [stepId]: 'completed' }));
    setPoppedId(stepId);
    recordStep(stepId, 'completed');
    return true;
  }

  function handlePrimary() {
    if (phase !== 'idle') return;
    const added = markComplete(step.id);
    setPhase('flashing');
    later(() => moveOn(added ? completedCount + 1 : completedCount), FLASH_MS);
  }

  function handleSidebarCheck(stepId: string) {
    if (phase !== 'idle') return;
    markComplete(stepId);
  }

  function handleSkip() {
    if (phase !== 'idle') return;
    if (statuses[step.id] !== 'completed') {
      setStatuses((current) => ({ ...current, [step.id]: 'skipped' }));
      recordStep(step.id, 'skipped');
    }
    setToastKey(Date.now());
    moveOn(completedCount);
  }

  function handleJump(targetIndex: number) {
    if (phase !== 'idle' || targetIndex === index) return;
    setIndex(targetIndex);
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setSaveFailed(false);
    try {
      await saveSessionProgress(steps, statuses);
      onSaved();
    } catch {
      setSaveFailed(true);
      setSaving(false);
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (confirmOpen) {
        if (event.key === 'Escape') setConfirmOpen(false);
        return;
      }
      if (event.key === 'Escape') {
        setConfirmOpen(true);
        return;
      }
      if (!isPrimaryShortcut(event)) return;
      event.preventDefault();
      handlePrimary();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-stretch">
      <FocusSidebar
        title={title}
        steps={steps}
        statuses={statuses}
        currentIndex={index}
        percent={percent}
        poppedId={poppedId}
        onJump={handleJump}
        onCheck={handleSidebarCheck}
        onSave={() => void handleSave()}
        onEditHomework={onEditHomework}
        saving={saving}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {saveFailed && (
          <p role="alert" className="text-sm font-medium text-red-600">
            Couldn't save your progress — check your connection.
          </p>
        )}
        {!isFinishing && (
          <div
            className={`grid gap-6 ${hasVocabulary ? 'lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)] lg:items-start' : ''}`}
          >
            <div
              key={index}
              className={`flex min-w-0 flex-col ${phase === 'leaving' ? 'animate-fade-out' : 'animate-fade-in-quick'}`}
            >
              <StepPanel
                key={step.id}
                step={step}
                stepNumber={index + 1}
                total={total}
                isFlashing={isFlashing}
                timerRunning={phase === 'idle'}
                toastVisible={toastKey !== null}
                onPrimary={handlePrimary}
                onSkip={handleSkip}
              />
            </div>
            {hasVocabulary && <VocabularyHelp items={session.vocabulary} />}
          </div>
        )}
      </div>

      {confirmOpen && <LeaveConfirmDialog onCancel={() => setConfirmOpen(false)} onLeave={onLeave} />}
    </div>
  );
}

function FocusView(props: FocusViewProps) {
  if (!props.session.steps.length) {
    return <EmptySteps onBack={props.onLeave} />;
  }
  return <FocusSession {...props} />;
}

export default FocusView;
