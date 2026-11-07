import { useCallback, useEffect, useState } from 'react';
import AuthModal, { type AuthMode } from '@/components/AuthModal';
import CompletionView from '@/components/CompletionView';
import FocusView from '@/components/FocusView';
import InputView from '@/components/InputView';
import LandingHeader from '@/components/LandingHeader';
import LoadingView from '@/components/LoadingView';
import RecentSessions from '@/components/RecentSessions';
import SaveToast from '@/components/SaveToast';
import LanguageToggle from '@/components/LanguageToggle';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfileName } from '@/hooks/useProfileName';
import { signOut } from '@/lib/auth';
import { breakDownHomework, MAX_HOMEWORK_CHARS } from '@/lib/breakdown';
import {
  buildPromptText,
  isSameFileList,
  readStoredFile,
  storedFileToFile,
  toInlineFiles,
  validateNewFiles,
  type StoredFile,
} from '@/lib/homeworkFile';
import {
  createSession,
  loadSession,
  markStep,
  type SavedSession,
} from '@/lib/sessions';

type View = 'input' | 'loading' | 'focus' | 'complete';

const NOTICE_MS = 3000;
const SAVE_NAVIGATE_MS = 500;

type AuthModalState = { mode: AuthMode; notice?: string };
type Notice = { message: string; id: number };

function App() {
  const { language, t } = useLanguage();
  const { session: authSession, isReady } = useAuthSession();
  const profileName = useProfileName(authSession?.user.id ?? null);
  const metadataName = authSession?.user.user_metadata?.full_name;
  const displayName =
    profileName ??
    (typeof metadataName === 'string' && metadataName.trim() ? metadataName.trim() : null) ??
    authSession?.user.email ??
    null;
  const [view, setView] = useState<View>('input');
  const [homework, setHomework] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sourceHomework, setSourceHomework] = useState<string | null>(null);
  const [sourceFiles, setSourceFiles] = useState<File[]>([]);
  const [activeSession, setActiveSession] = useState<SavedSession | null>(null);
  const [startIndex, setStartIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [saveToastKey, setSaveToastKey] = useState<number | null>(null);
  const [authModal, setAuthModal] = useState<AuthModalState | null>(null);
  const dismissSaveToast = useCallback(() => setSaveToastKey(null), []);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(id);
  }, [notice]);

  async function handleBreakItDown() {
    const text = homework.trim();
    if ((!text && files.length === 0) || text.length > MAX_HOMEWORK_CHARS) return;

    if (!authSession) {
      setAuthModal({ mode: 'signup', notice: t('signupNotice') });
      return;
    }

    if (sourceHomework !== null && text === sourceHomework && isSameFileList(files, sourceFiles)) {
      setNotice({ message: t('noChanges'), id: Date.now() });
      return;
    }

    setErrorMessage(null);
    setNotice(null);
    setView('loading');

    let storedFiles: StoredFile[];
    try {
      storedFiles = await Promise.all(files.map(readStoredFile));
    } catch {
      setErrorMessage(t('fileReadError'));
      setView('input');
      return;
    }

    const promptText = buildPromptText(text, storedFiles);
    if (promptText.length > MAX_HOMEWORK_CHARS) {
      setErrorMessage(t('tooLongFile'));
      setView('input');
      return;
    }

    try {
      const breakdown = await breakDownHomework(promptText, toInlineFiles(storedFiles), language);
      const saved = await createSession(text, breakdown, storedFiles);
      setActiveSession(saved);
      setSourceHomework(null);
      setFiles([]);
      setStartIndex(0);
      setView('focus');
    } catch {
      setErrorMessage(t('genericError'));
      setView('input');
    }
  }

  function handleFilesSelect(selected: File[]) {
    const error = validateNewFiles(files, selected, t);
    if (error) {
      setErrorMessage(error);
      return;
    }
    setErrorMessage(null);
    setFiles((current) => [...current, ...selected]);
  }

  async function handleResume(sessionId: string) {
    const saved = await loadSession(sessionId);
    const completed = saved.steps.filter((step) => step.completed).length;
    const nextIndex = saved.steps.findIndex((step) => !step.completed && !step.skipped);

    setActiveSession(saved);
    setCompletedSteps(completed);
    if (nextIndex === -1) {
      setView('complete');
      return;
    }
    setStartIndex(nextIndex);
    setView('focus');
  }

  function handleFinish(completed: number) {
    setCompletedSteps(completed);
    setView('complete');
  }

  function returnToInput() {
    setHomework('');
    setFiles([]);
    setSourceHomework(null);
    setSourceFiles([]);
    setActiveSession(null);
    setStartIndex(0);
    setCompletedSteps(0);
    setErrorMessage(null);
    setNotice(null);
    setView('input');
  }

  function handleEditHomework() {
    if (!activeSession) return;
    const original = activeSession.homework_text;
    const restored = activeSession.files.map(storedFileToFile);
    returnToInput();
    setHomework(original);
    setFiles(restored);
    setSourceHomework(original);
    setSourceFiles(restored);
  }

  function handleSessionSaved() {
    setSaveToastKey(Date.now());
    window.setTimeout(returnToInput, SAVE_NAVIGATE_MS);
  }

  async function handleLogout() {
    try {
      await signOut();
    } catch {
      setErrorMessage(t('logoutError'));
      return;
    }
    returnToInput();
  }

  if (!isReady) return <main className="min-h-screen bg-canvas" />;

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-canvas px-6 py-16 text-ink">
      <div className="fixed right-6 top-6 z-[60] flex items-center gap-4">
        {authSession && view !== 'input' && view !== 'focus' && (
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="text-sm font-semibold text-accent transition-opacity hover:opacity-80 focus:outline-none focus-visible:underline"
          >
            {t('logOut')}
          </button>
        )}
        <LanguageToggle />
      </div>
      <div className={`w-full ${view === 'focus' ? '' : 'max-w-[640px]'}`}>
        {view === 'input' && (
          <>
            <LandingHeader
              userName={displayName}
              onLogIn={() => setAuthModal({ mode: 'login' })}
              onSignUp={() => setAuthModal({ mode: 'signup' })}
              onLogOut={() => void handleLogout()}
            />
            <InputView
              value={homework}
              files={files}
              errorMessage={errorMessage}
              notice={notice?.message ?? null}
              onChange={setHomework}
              onFilesSelect={handleFilesSelect}
              onFileRemove={(index) => setFiles((current) => current.filter((_, i) => i !== index))}
              onSubmit={handleBreakItDown}
            />
            {authSession && <RecentSessions onResume={handleResume} />}
          </>
        )}
        {authSession && view === 'loading' && <LoadingView />}
        {authSession && view === 'focus' && activeSession && (
          <FocusView
            session={activeSession}
            startIndex={startIndex}
            onStepUpdate={markStep}
            onLeave={() => setView('input')}
            onFinish={handleFinish}
            onSaved={handleSessionSaved}
            onEditHomework={handleEditHomework}
          />
        )}
        {authSession && view === 'complete' && activeSession && (
          <CompletionView
            title={activeSession.session_title}
            completed={completedSteps}
            total={activeSession.steps.length}
            onStartOver={returnToInput}
          />
        )}
      </div>
      {saveToastKey !== null && (
        <SaveToast key={saveToastKey} onDone={dismissSaveToast} />
      )}
      {authModal && (
        <AuthModal
          initialMode={authModal.mode}
          notice={authModal.notice}
          onClose={() => setAuthModal(null)}
          onSuccess={() => setAuthModal(null)}
        />
      )}
    </main>
  );
}

export default App;
