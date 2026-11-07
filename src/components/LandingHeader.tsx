import { useLanguage } from '@/hooks/useLanguage';

type LandingHeaderProps = {
  userName: string | null;
  onLogIn: () => void;
  onSignUp: () => void;
  onLogOut: () => void;
};

function LandingHeader({ userName, onLogIn, onSignUp, onLogOut }: LandingHeaderProps) {
  const { t } = useLanguage();
  return (
    <header className="mb-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-5xl font-bold tracking-tight text-ink leading-[1.2]">Stepwise</h1>
        {userName ? (
          <div className="flex min-w-0 items-center gap-3">
            <span className="truncate text-sm text-ink/60" title={userName}>
              {userName}
            </span>
            <button
              type="button"
              onClick={onLogOut}
              className="shrink-0 text-sm font-semibold text-accent transition-opacity hover:opacity-80 focus:outline-none focus-visible:underline"
            >
              {t('logOut')}
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onLogIn}
              className="rounded-lg border border-ink/15 bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink/5 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
            >
              {t('logIn')}
            </button>
            <button
              type="button"
              onClick={onSignUp}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
            >
              {t('signUp')}
            </button>
          </div>
        )}
      </div>
      <p className="mt-3 text-lg leading-[1.5] text-ink/70">{t('tagline')}</p>
    </header>
  );
}

export default LandingHeader;
