import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { VocabularyItem } from '@/lib/breakdown';

type VocabularyHelpProps = {
  items: VocabularyItem[];
};

function VocabularyHelp({ items }: VocabularyHelpProps) {
  const [open, setOpen] = useState(true);

  if (items.length === 0) return null;

  return (
    <aside className="lg:sticky lg:top-8">
      <section className="flex flex-col rounded-2xl border border-ink/10 bg-[#F9F9F9] p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-bold text-ink">Vocabulary</h2>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            className="inline-flex items-center gap-1 text-sm font-medium text-ink/70 transition-colors hover:text-ink focus:outline-none focus-visible:underline"
          >
            {open ? 'Hide' : `Show (${items.length})`}
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>

        {open && (
          <dl className="animate-fade-in-quick mt-4 flex max-h-[calc(100vh-10rem)] flex-col gap-4 overflow-y-auto pr-2">
            {items.map((item, index) => (
              <div key={`${item.word}-${index}`} className="flex flex-col gap-0.5">
                <dt className="text-sm font-bold text-ink">{item.word}</dt>
                <dd className="text-sm leading-[1.5] text-ink/65">{item.definition}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </aside>
  );
}

export default VocabularyHelp;
