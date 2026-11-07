import { useEffect, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { formatRelativeDate } from '@/lib/relativeDate';
import { listRecentSessions, type RecentSession } from '@/lib/sessions';

type RecentSessionsProps = {
  onResume: (sessionId: string) => Promise<void>;
};

function RecentSessions({ onResume }: RecentSessionsProps) {
  const { t, language } = useLanguage();
  const [sessions, setSessions] = useState<RecentSession[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [openFailed, setOpenFailed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;
    listRecentSessions().then(
      (rows) => {
        if (active) setSessions(rows);
      },
      () => {
        if (active) setLoadFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  async function handleResume(sessionId: string) {
    setOpeningId(sessionId);
    setOpenFailed(false);
    try {
      await onResume(sessionId);
    } catch {
      setOpenFailed(true);
    } finally {
      setOpeningId(null);
    }
  }

  let body;
  if (loadFailed) {
    body = <p className="mt-4 text-sm text-ink/70">{t('recentLoadFailed')}</p>;
  } else if (sessions === null) {
    body = <p className="mt-4 text-sm text-ink/60">{t('loadingSessions')}</p>;
  } else if (sessions.length === 0) {
    body = (
      <p className="mt-4 text-sm text-ink/60">{t('noSessions')}</p>
    );
  } else {
    const visibleSessions = showAll ? sessions : sessions.slice(0, 5);
    body = (
      <>
      <ul className="mt-4 divide-y divide-ink/10 rounded-xl border border-ink/10 bg-white">
        {visibleSessions.map((session) => (
          <li key={session.id} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <p className="break-words text-base font-medium text-ink">{language === 'no' ? session.session_title_no : session.session_title_en}</p>
              <p className="mt-1 text-sm text-ink/60">{formatRelativeDate(session.created_at, t)}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleResume(session.id)}
              disabled={openingId !== null}
              className="shrink-0 text-sm font-semibold text-accent transition-opacity hover:opacity-80 focus:outline-none focus-visible:underline disabled:opacity-40"
            >
              {openingId === session.id ? t('opening') : t('resume')}
            </button>
          </li>
        ))}
      </ul>
      {sessions.length > 5 ? (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          className="mt-3 text-sm font-medium text-ink/60 underline-offset-4 transition-colors hover:text-ink hover:underline focus:outline-none focus-visible:underline"
        >
          {showAll ? t('showLess') : t('showMore')}
        </button>
      ) : null}
      </>
    );
  }

  return (
    <section className="mt-12">
      <h2 className="text-lg font-semibold text-ink">{t('recentSessions')}</h2>
      {body}
      {openFailed ? (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          {t('openFailed')}
        </p>
      ) : null}
    </section>
  );
}

export default RecentSessions;
