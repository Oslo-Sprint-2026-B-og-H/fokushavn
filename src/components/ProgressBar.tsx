type ProgressBarProps = {
  percent: number;
  tone: 'accent' | 'success';
  thick?: boolean;
};

const TONE_CLASS: Record<ProgressBarProps['tone'], string> = {
  accent: 'bg-accent',
  success: 'bg-success',
};

function ProgressBar({ percent, tone, thick = false }: ProgressBarProps) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      className={`w-full overflow-hidden rounded-full bg-ink/10 ${thick ? 'h-3' : 'h-1.5'}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${TONE_CLASS[tone]}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export default ProgressBar;
