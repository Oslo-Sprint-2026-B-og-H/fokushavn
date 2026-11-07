import { useEffect, useState, type FormEvent, type MouseEvent } from 'react';
import { X } from 'lucide-react';
import { signIn, signUp } from '@/lib/auth';

export type AuthMode = 'login' | 'signup';

type AuthModalProps = {
  initialMode: AuthMode;
  notice?: string;
  onClose: () => void;
  onSuccess: () => void;
};

const AUTH_ERROR = "That didn't work — check your email and password.";

const COPY: Record<AuthMode, { title: string; switchPrompt: string; switchLabel: string }> = {
  login: {
    title: 'Log in',
    switchPrompt: "Don't have an account?",
    switchLabel: 'Sign up',
  },
  signup: {
    title: 'Sign up',
    switchPrompt: 'Already have an account?',
    switchLabel: 'Log in',
  },
};

function AuthModal({ initialMode, notice, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const copy = COPY[mode];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  function switchMode() {
    setMode(mode === 'login' ? 'signup' : 'login');
    setPassword('');
    setErrorMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    setIsPending(true);
    setErrorMessage(null);
    try {
      const trimmedEmail = email.trim();
      if (mode === 'login') await signIn(trimmedEmail, password);
      else await signUp(fullName.trim(), trimmedEmail, password);
      onSuccess();
    } catch {
      setErrorMessage(AUTH_ERROR);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div
      className="animate-fade-in-modal fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative w-full max-w-[400px] rounded-2xl bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {notice ? <p className="pr-10 text-sm leading-[1.5] text-ink/60">{notice}</p> : null}
        <h2 id="auth-modal-title" className="pr-10 text-2xl font-bold leading-[1.2] text-ink">
          {copy.title}
        </h2>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {mode === 'signup' ? (
            <label className="flex flex-col gap-2 text-sm font-medium text-ink">
              Name
              <input
                type="text"
                name="name"
                autoComplete="name"
                required
                maxLength={100}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="rounded-xl border border-ink/15 bg-white px-4 py-3 text-base font-normal text-ink transition-colors focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
              />
            </label>
          ) : null}
          <label className="flex flex-col gap-2 text-sm font-medium text-ink">
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border border-ink/15 bg-white px-4 py-3 text-base font-normal text-ink transition-colors focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-ink">
            Password
            <input
              type="password"
              name="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-xl border border-ink/15 bg-white px-4 py-3 text-base font-normal text-ink transition-colors focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
            />
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 w-full rounded-xl bg-accent px-6 py-3 text-base font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copy.title}
          </button>

          {errorMessage ? (
            <p role="alert" className="text-sm font-medium text-red-600">
              {errorMessage}
            </p>
          ) : null}
        </form>

        <p className="mt-6 text-center text-sm text-ink/60">
          {copy.switchPrompt}{' '}
          <button
            type="button"
            onClick={switchMode}
            disabled={isPending}
            className="font-semibold text-accent transition-opacity hover:opacity-80 focus:outline-none focus-visible:underline disabled:opacity-40"
          >
            {copy.switchLabel}
          </button>
        </p>
      </div>
    </div>
  );
}

export default AuthModal;
