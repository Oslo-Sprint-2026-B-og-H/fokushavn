import { useLanguage } from '@/hooks/useLanguage';
import { LANGUAGES, type Language } from '@/lib/translations';

const LABELS: Record<Language, string> = { en: 'EN', no: 'NO' };

function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t('language')}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-ink/15 bg-white p-1 shadow-sm"
    >
      {LANGUAGES.map((option) => {
        const isActive = option === language;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isActive}
            onClick={() => setLanguage(option)}
            className={`rounded-full px-2.5 py-1 text-xs tracking-wide transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30 ${
              isActive
                ? 'bg-[#4A90D9]/15 font-bold text-ink'
                : 'font-medium text-ink/50 hover:text-ink'
            }`}
          >
            {LABELS[option]}
          </button>
        );
      })}
    </div>
  );
}

export default LanguageToggle;
