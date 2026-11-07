import { useLanguage } from '@/hooks/useLanguage';

type LeaveConfirmDialogProps = {
  onCancel: () => void;
  onLeave: () => void;
};

function LeaveConfirmDialog({ onCancel, onLeave }: LeaveConfirmDialogProps) {
  const { t } = useLanguage();
  return (
    <div
      className="animate-fade-in-quick fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-6"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-session-title"
        className="w-full max-w-sm rounded-2xl bg-white p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="leave-session-title" className="text-xl font-bold leading-[1.2] text-ink">
          {t('leaveTitle')}
        </h2>
        <p className="mt-2 text-base leading-[1.5] text-ink/70">{t('leaveBody')}</p>
        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="rounded-xl border border-ink/15 px-5 py-3 text-base font-semibold text-ink transition-colors hover:bg-ink/5 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="rounded-xl bg-accent px-5 py-3 text-base font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
          >
            {t('leave')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LeaveConfirmDialog;
