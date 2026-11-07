import { useEffect } from 'react';
import ProgressBar from '@/components/ProgressBar';
import { useLanguage } from '@/hooks/useLanguage';
import { isPrimaryShortcut } from '@/lib/shortcuts';

type CompletionViewProps = {
  title: string;
  completed: number;
  total: number;
  onStartOver: () => void;
};

function CompletionView({ title, completed, total, onStartOver }: CompletionViewProps) {
  const { t } = useLanguage();
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!isPrimaryShortcut(event)) return;
      event.preventDefault();
      onStartOver();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStartOver]);

  return (
    <div className="animate-fade-in">
      <ProgressBar percent={100} tone="success" />

      <div className="mt-16 flex flex-col items-center text-center">
        <h1 className="text-3xl font-bold leading-[1.2] tracking-tight text-ink">{title}</h1>
        <p className="mt-4 text-lg leading-[1.5] text-ink/80">
          {t('completionMessage')}
        </p>
        <p className="mt-2 text-base leading-[1.5] text-ink/60">
          {t('completedCount', { completed, total })}
        </p>
        <button
          type="button"
          onClick={onStartOver}
          className="mt-10 h-14 rounded-xl bg-accent px-10 text-lg font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
        >
          {t('startOver')}
        </button>
      </div>
    </div>
  );
}

export default CompletionView;
