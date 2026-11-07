import { parseStepContent, type ContentBlock } from '@/lib/stepContent';

type StepBodyProps = {
  text: string;
};

function BlockView({ block }: { block: ContentBlock }) {
  switch (block.kind) {
    case 'heading':
      return <h3 className="pt-3 text-[22px] font-semibold leading-[1.3] text-ink">{block.text}</h3>;
    case 'paragraph':
      return <p className="text-[17px] font-normal leading-[1.85] text-ink/85">{block.text}</p>;
    case 'equation':
      return (
        <p className="rounded-xl bg-[#F3F3F3] px-5 py-4 font-mono text-lg text-ink break-words">
          {block.text}
        </p>
      );
    case 'question':
      return (
        <div className="flex gap-4 rounded-xl border border-ink/10 bg-white p-5">
          <span className="shrink-0 pt-0.5 text-sm font-semibold uppercase tracking-wide text-ink/60">
            {block.label}
          </span>
          <p className="min-w-0 text-[18px] font-medium leading-[1.6] text-ink">{block.text}</p>
        </div>
      );
  }
}

function StepBody({ text }: StepBodyProps) {
  const content = parseStepContent(text);

  return (
    <div className="flex w-full flex-col gap-5 text-left">
      <div className="flex flex-col gap-3">
        <h2 className="break-words text-2xl font-bold leading-[1.2] text-ink md:text-[28px]">
          {content.title}
        </h2>
        {content.instructions ? (
          <p className="text-base font-normal leading-[1.6] text-ink/60">{content.instructions}</p>
        ) : null}
      </div>

      {content.blocks.map((block, index) => (
        <BlockView key={index} block={block} />
      ))}
    </div>
  );
}

export default StepBody;
