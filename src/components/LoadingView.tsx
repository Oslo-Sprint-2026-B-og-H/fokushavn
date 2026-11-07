import { useLanguage } from '@/hooks/useLanguage';

function LoadingView() {
  const { t } = useLanguage();
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center gap-6 py-16 text-center">
      <div
        role="status"
        aria-label="Loading"
        className="h-10 w-10 animate-spin rounded-full border-[3px] border-ink/10 border-t-accent"
      />
      <p className="text-lg leading-[1.5] text-ink/80">{t('loadingMessage')}</p>
    </div>
  );
}

export default LoadingView;
