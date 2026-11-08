import type { StepType } from '@/lib/breakdown';

export type ContentBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'equation'; text: string }
  | { kind: 'question'; number: string; text: string };

export type ParsedStepContent = {
  title: string;
  instructions: string | null;
  blocks: ContentBlock[];
};

export type StepKind = 'break' | 'question' | 'reading' | 'task';

const SENTENCE = /^(.+?[.!?])\s+(.+)$/;
const QUESTION = /^(?:question|q|spørsmål)\s*(\d+)\s*[:.)-]\s*(.*)$/i;
const TERMINAL_PUNCTUATION = /[.!?:;,"'”)]$/;
const MAX_HEADING_CHARS = 80;

function splitBlocks(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}

function splitLines(block: string): string[] {
  return block
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function isEquation(line: string): boolean {
  return /[=^*/]/.test(line) && !/[A-Za-z]{3,}/.test(line) && !/[.!?]$/.test(line);
}

function isHeadingLine(line: string): boolean {
  return (
    line.length <= MAX_HEADING_CHARS &&
    !TERMINAL_PUNCTUATION.test(line) &&
    !isEquation(line) &&
    !QUESTION.test(line)
  );
}

function parseTaskHead(block: string): Pick<ParsedStepContent, 'title' | 'instructions'> {
  const flat = splitLines(block).join(' ');
  const sentence = SENTENCE.exec(flat);
  if (!sentence) {
    return { title: flat.replace(/:$/, '').trim(), instructions: null };
  }
  return { title: sentence[1].trim(), instructions: sentence[2].trim() };
}

function parseBodyBlock(block: string): ContentBlock[] {
  const lines = splitLines(block);
  const [first, ...rest] = lines;

  const question = QUESTION.exec(first);
  if (question) {
    return [
      {
        kind: 'question',
        number: question[1],
        text: [question[2], ...rest].join(' ').trim(),
      },
    ];
  }

  if (lines.length === 1 && isEquation(first)) {
    return [{ kind: 'equation', text: first }];
  }

  if (isHeadingLine(first)) {
    const blocks: ContentBlock[] = [{ kind: 'heading', text: first }];
    if (rest.length > 0) blocks.push({ kind: 'paragraph', text: rest.join(' ') });
    return blocks;
  }

  return [{ kind: 'paragraph', text: lines.join(' ') }];
}

export function parseStepContent(text: string): ParsedStepContent {
  const [head = '', ...body] = splitBlocks(text);
  return {
    ...parseTaskHead(head),
    blocks: body.flatMap(parseBodyBlock),
  };
}

export function classifyStep(type: StepType, content: ParsedStepContent): StepKind {
  if (type === 'break') return 'break';
  if (content.blocks.some((block) => block.kind === 'question')) return 'question';
  if (content.blocks.some((block) => block.kind === 'heading' || block.kind === 'paragraph')) {
    return 'reading';
  }
  return 'task';
}
