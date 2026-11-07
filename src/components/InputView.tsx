import { FormEvent } from 'react';
import { MAX_HOMEWORK_CHARS } from '@/lib/breakdown';

type InputViewProps = {
  value: string;
  errorMessage: string | null;
  notice: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

function InputView({ value, errorMessage, notice, onChange, onSubmit }: InputViewProps) {
  const length = value.length;
  const isEmpty = value.trim().length === 0;
  const isTooLong = length > MAX_HOMEWORK_CHARS;
  const isDisabled = isEmpty || isTooLong;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isDisabled) onSubmit();
  }

  return (
    <div className="animate-fade-in">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Paste your homework here."
            aria-label="Homework text"
            aria-invalid={isTooLong}
            className="min-h-[240px] w-full resize-y rounded-2xl border border-ink/15 bg-white p-6 text-lg leading-[1.5] text-ink placeholder:text-ink/40 transition-colors focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
          />
          <div className="flex items-center justify-between gap-4 px-1 text-sm">
            <p className={isTooLong ? 'text-red-600' : 'text-ink/60'}>
              {isTooLong
                ? "That's a lot! Try pasting just the main assignment for now."
                : null}
            </p>
            <span
              className={`shrink-0 tabular-nums ${isTooLong ? 'font-semibold text-red-600' : 'text-ink/60'}`}
            >
              {length} / {MAX_HOMEWORK_CHARS}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="submit"
            disabled={isDisabled}
            className="self-start rounded-xl bg-accent px-6 py-3 text-base font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40"
          >
            Break it down
          </button>
          {errorMessage ? (
            <p role="alert" className="text-sm font-medium text-red-600">
              {errorMessage}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="animate-fade-in-quick text-sm font-medium text-ink/70">
              {notice}
            </p>
          ) : null}
          <p className="text-sm leading-[1.5] text-ink/60">
            Paste text for now — file upload coming soon.
          </p>
        </div>
      </form>
    </div>
  );
}

export default InputView;
