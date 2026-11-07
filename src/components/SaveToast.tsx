import { useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';

type SaveToastProps = {
  onDone: () => void;
};

const TOAST_MS = 2000;

function SaveToast({ onDone }: SaveToastProps) {
  const { t } = useLanguage();
  useEffect(() => {
    const id = window.setTimeout(onDone, TOAST_MS);
    return () => window.clearTimeout(id);
  }, [onDone]);

  return (
    <div
      role="status"
      className="pointer-events-none fixed left-1/2 top-6 z-50 -translate-x-1/2 animate-toast rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-lg"
    >
      {t('sessionSaved')}
    </div>
  );
}

export default SaveToast;
