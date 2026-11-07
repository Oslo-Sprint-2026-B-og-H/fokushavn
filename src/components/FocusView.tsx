import { useEffect, useRef, useState } from 'react';
import FocusSidebar from '@/components/FocusSidebar';
import LeaveConfirmDialog from '@/components/LeaveConfirmDialog';
import LoadingView from '@/components/LoadingView';
import StepPanel from '@/components/StepPanel';
import VocabularyHelp from '@/components/VocabularyHelp';
import VoiceAgent from '@/components/VoiceAgent';
import { useLanguage } from '@/hooks/useLanguage';
import { useWakeLock } from '@/hooks/useWakeLock';
import { isPrimaryShortcut } from '@/lib/shortcuts';
import {
  saveSessionProgress,
  saveTranslatedSession,
  translateSessionContent,
  type SavedSession,
  type SavedStep,
  type StepStatus,
  type TranslatableContent,
} from '@/lib/sessions';

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
  const { t } = useLanguage();
  return (
    <div className="animate-fade-in">
      <p className="text-lg leading-[1.5] text-ink">
        {t('noSteps')}
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-6 text-sm font-medium text-accent transition-opacity hover:opacity-80 focus:outline-none focus-visible:underline"
      >
        {t('back')}
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
  const { t, language } = useLanguage();
  const [content, setContent] = useState<TranslatableContent>(() => ({
    session_title: session.session_title,
    vocabulary: session.vocabulary,
    steps: session.steps,
  }));
  const { steps, vocabulary, session_title: title } = content;
  const total = steps.length;
  const translatedLanguageRef = useRef(language);
  const [translating, setTranslating] = useState(false);
  const [translateFailed, setTranslateFailed] = useState(false);

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
  const hasVocabulary = vocabulary.length > 0;
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
    if (translatedLanguageRef.current === language) return;
    translatedLanguageRef.current = language;
    let active = true;
    setTranslating(true);
    setTranslateFailed(false);
    (async () => {
      try {
        const translated = await translateSessionContent(content, language);
        if (!active) return;
        setContent(translated);
        setTranslating(false);
        saveTranslatedSession(session.id, translated).catch(() => setTranslateFailed(true));
      } catch {
        if (!active) return;
        setTranslating(false);
        setTranslateFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [language, content, session.id]);

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
    if (phase !== 'idle' || translating) return;
    const added = markComplete(step.id);
    setPhase('flashing');
    later(() => moveOn(added ? completedCount + 1 : completedCount), FLASH_MS);
  }

  function handleSidebarCheck(stepId: string) {
    if (phase !== 'idle') return;
    if (statuses[stepId] !== 'completed') {
      markComplete(stepId);
      return;
    }
    const next: StatusMap = { ...statuses, [stepId]: undefined };
    setStatuses(next);
    saveSessionProgress(steps, next).then(
      () => setSaveFailed(false),
      () => setSaveFailed(true),
    );
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
            {t('saveFailed')}
          </p>
        )}
        {translateFailed && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {t('genericError')}
          </p>
        )}
        {!isFinishing && translating && <LoadingView />}
        {!isFinishing && !translating && (
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
            {hasVocabulary && <VocabularyHelp items={vocabulary} />}
          </div>
        )}
      </div>

      {confirmOpen && <LeaveConfirmDialog onCancel={() => setConfirmOpen(false)} onLeave={onLeave} />}
      <VoiceAgent step={step} vocabulary={vocabulary} />
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
