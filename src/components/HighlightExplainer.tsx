import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X } from 'lucide-react';
import { explainText } from '@/lib/explain';

type ExplainStatus = 'button' | 'loading' | 'ready' | 'error';

type Highlight = {
  status: ExplainStatus;
  text: string;
  rect: DOMRect;
  answer: string;
};

const VIEWPORT_MARGIN = 8;
const GAP = 10;
const BUTTON_HALF_WIDTH = 56;
const BUTTON_OFFSET = 40;
const POPOVER_WIDTH = 320;
const POPOVER_MIN_HEIGHT = 120;
const ABOVE_TOP_THRESHOLD = 48;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buttonStyle(rect: DOMRect): CSSProperties {
  const centerX = rect.left + rect.width / 2;
  const left = clamp(
    centerX,
    VIEWPORT_MARGIN + BUTTON_HALF_WIDTH,
    window.innerWidth - VIEWPORT_MARGIN - BUTTON_HALF_WIDTH,
  );
  const top = rect.top >= ABOVE_TOP_THRESHOLD ? rect.top - BUTTON_OFFSET : rect.bottom + GAP;
  return { left, top };
}

function popoverStyle(rect: DOMRect): CSSProperties {
  const width = Math.min(POPOVER_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
  const centerX = rect.left + rect.width / 2;
  const left = clamp(centerX - width / 2, VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN);
  const spaceBelow = window.innerHeight - rect.bottom - GAP - VIEWPORT_MARGIN;
  const spaceAbove = rect.top - GAP - VIEWPORT_MARGIN;

  if (spaceBelow < POPOVER_MIN_HEIGHT && spaceAbove > spaceBelow) {
    return {
      left,
      width,
      bottom: window.innerHeight - rect.top + GAP,
      maxHeight: Math.max(spaceAbove, POPOVER_MIN_HEIGHT),
    };
  }
  return {
    left,
    width,
    top: rect.bottom + GAP,
    maxHeight: Math.max(spaceBelow, POPOVER_MIN_HEIGHT),
  };
}

function PopoverBody({ highlight }: { highlight: Highlight }) {
  if (highlight.status === 'loading') {
    return <p className="text-ink/60">Thinking...</p>;
  }
  if (highlight.status === 'error') {
    return <p className="text-red-600">Couldn't get an explanation. Close this and try again.</p>;
  }
  return <p>{highlight.answer}</p>;
}

function HighlightExplainer({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<Range | null>(null);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const isOpen = highlight !== null;

  const dismiss = useCallback(() => {
    rangeRef.current = null;
    setHighlight(null);
  }, []);

  function captureSelection() {
    const container = containerRef.current;
    const selection = window.getSelection();
    if (!container || !selection || selection.rangeCount === 0) {
      dismiss();
      return;
    }

    const text = selection.toString().trim();
    const range = selection.getRangeAt(0);
    const isValidLength = text.length > 2 && text.length < 250;
    if (!isValidLength || !container.contains(range.commonAncestorContainer)) {
      dismiss();
      return;
    }

    rangeRef.current = range.cloneRange();
    setHighlight({ status: 'button', text, rect: range.getBoundingClientRect(), answer: '' });
  }

  async function handleExplain() {
    if (!highlight) return;
    const { text } = highlight;
    setHighlight({ ...highlight, status: 'loading' });

    const isCurrentRequest = (current: Highlight | null) =>
      current !== null && current.text === text && current.status === 'loading';

    try {
      const answer = await explainText(text);
      setHighlight((current) =>
        isCurrentRequest(current) && current ? { ...current, status: 'ready', answer } : current,
      );
    } catch {
      setHighlight((current) =>
        isCurrentRequest(current) && current ? { ...current, status: 'error' } : current,
      );
    }
  }

  useEffect(() => {
    if (!isOpen) return;

    function refreshPosition() {
      const range = rangeRef.current;
      if (!range) return;
      const rect = range.getBoundingClientRect();
      setHighlight((current) => (current ? { ...current, rect } : current));
    }

    window.addEventListener('scroll', refreshPosition, { passive: true });
    window.addEventListener('resize', refreshPosition);
    return () => {
      window.removeEventListener('scroll', refreshPosition);
      window.removeEventListener('resize', refreshPosition);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: Event) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (buttonRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      dismiss();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') dismiss();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, dismiss]);

  return (
    <>
      <div
        ref={containerRef}
        onMouseUp={captureSelection}
        onKeyUp={captureSelection}
        onTouchEnd={captureSelection}
      >
        {children}
      </div>

      {highlight?.status === 'button' &&
        createPortal(
          <button
            ref={buttonRef}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void handleExplain()}
            style={buttonStyle(highlight.rect)}
            className="animate-fade-in-quick fixed z-50 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#4A90D9] px-3 py-1.5 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/40"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Explain
          </button>,
          document.body,
        )}

      {highlight && highlight.status !== 'button' &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Explanation"
            style={popoverStyle(highlight.rect)}
            className="animate-fade-in-quick fixed z-50 flex flex-col gap-3 overflow-y-auto overscroll-contain rounded-2xl border border-ink/10 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 break-words text-sm font-bold leading-[1.4] text-ink">
                {highlight.text}
              </p>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Close explanation"
                className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="text-[15px] leading-[1.5] text-ink/80" aria-live="polite">
              <PopoverBody highlight={highlight} />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export default HighlightExplainer;
