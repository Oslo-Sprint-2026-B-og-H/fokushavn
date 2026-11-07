import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { MAX_HOMEWORK_CHARS } from '@/lib/breakdown';
import { FILE_INPUT_ACCEPT, formatFileSize } from '@/lib/homeworkFile';

type InputViewProps = {
  value: string;
  file: File | null;
  errorMessage: string | null;
  notice: string | null;
  onChange: (value: string) => void;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  onSubmit: () => void;
};

function InputView({
  value,
  file,
  errorMessage,
  notice,
  onChange,
  onFileSelect,
  onFileRemove,
  onSubmit,
}: InputViewProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const length = value.length;
  const isEmpty = value.trim().length === 0;
  const isTooLong = length > MAX_HOMEWORK_CHARS;
  const isDisabled = (isEmpty && file === null) || isTooLong;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isDisabled) onSubmit();
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (selected) onFileSelect(selected);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped) onFileSelect(dropped);
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
          {file ? (
            <div className="animate-fade-in-quick flex items-center gap-3 self-start rounded-xl border border-ink/15 bg-white py-2 pl-3 pr-2">
              <FileText className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
              <span className="max-w-[260px] truncate text-sm font-medium text-ink">{file.name}</span>
              <span className="shrink-0 text-sm text-ink/60">{formatFileSize(file.size)}</span>
              <button
                type="button"
                onClick={onFileRemove}
                aria-label={`Remove ${file.name}`}
                className="rounded-md p-1 text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-start gap-3 rounded-2xl border border-dashed px-6 py-5 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                isDragging ? 'border-accent bg-accent/5' : 'border-ink/20 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 shrink-0 text-ink/60" aria-hidden="true" />
                <p className="text-sm leading-[1.5] text-ink/70">
                  Drop a PDF, image, or text file here, or
                </p>
              </div>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="shrink-0 rounded-lg border border-ink/15 bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink/5 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
              >
                Upload file
              </button>
              <input
                ref={inputRef}
                type="file"
                accept={FILE_INPUT_ACCEPT}
                onChange={handleFileInput}
                className="hidden"
                aria-label="Upload homework file"
              />
            </div>
          )}

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
        </div>
      </form>
    </div>
  );
}

export default InputView;
