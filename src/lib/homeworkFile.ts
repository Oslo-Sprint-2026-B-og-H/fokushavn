export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const FILE_INPUT_ACCEPT = '.pdf,.png,.jpg,.jpeg,.txt';
export const FILE_TOO_LARGE_MESSAGE = 'File is too large. Please upload a file under 20MB.';
export const UNSUPPORTED_FILE_MESSAGE = 'Unsupported file type. Please upload a PDF, image, or text file.';

export type InlineFile = {
  mimeType: string;
  data: string;
};

export type HomeworkFileContent = { kind: 'text'; text: string } | ({ kind: 'inline' } & InlineFile);

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  txt: 'text/plain',
};

const DATA_URL_PATTERN = /^data:([^;]+);base64,([\s\S]*)$/;

function mimeTypeFor(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXTENSION[extension] ?? null;
}

function readAs(file: File, method: 'readAsText' | 'readAsDataURL'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader[method](file);
  });
}

export function validateHomeworkFile(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) return FILE_TOO_LARGE_MESSAGE;
  if (!mimeTypeFor(file)) return UNSUPPORTED_FILE_MESSAGE;
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function readHomeworkFile(file: File): Promise<HomeworkFileContent> {
  const mimeType = mimeTypeFor(file);
  if (!mimeType) throw new Error(UNSUPPORTED_FILE_MESSAGE);

  if (mimeType === 'text/plain') {
    return { kind: 'text', text: await readAs(file, 'readAsText') };
  }

  const dataUrl = await readAs(file, 'readAsDataURL');
  const match = DATA_URL_PATTERN.exec(dataUrl);
  if (!match) throw new Error('Could not read file');
  return { kind: 'inline', mimeType: match[1], data: match[2] };
}
