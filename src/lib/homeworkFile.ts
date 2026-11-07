export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
export const FILE_INPUT_ACCEPT = '.pdf,.png,.jpg,.jpeg,.txt';
export const FILE_TOO_LARGE_MESSAGE = 'File is too large. Please upload a file under 20MB.';
export const TOTAL_TOO_LARGE_MESSAGE = 'Your files are too large together. Please keep them under 20MB in total.';
export const UNSUPPORTED_FILE_MESSAGE = 'Unsupported file type. Please upload a PDF, image, or text file.';
export const TOO_MANY_FILES_MESSAGE = `Maximum ${MAX_FILES} files allowed.`;
export const FILE_READ_ERROR_MESSAGE = "One of your files couldn't be read. Remove it and try again.";

export type InlineFile = {
  mimeType: string;
  data: string;
};

export type StoredFile = {
  name: string;
  mimeType: string;
  base64: string;
};

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  txt: 'text/plain',
};

const DATA_URL_PATTERN = /^data:[^,]*;base64,([\s\S]*)$/;

export function mimeTypeFor(fileName: string): string | null {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXTENSION[extension] ?? null;
}

export function validateNewFiles(current: File[], incoming: File[]): string | null {
  if (current.length + incoming.length > MAX_FILES) return TOO_MANY_FILES_MESSAGE;
  for (const file of incoming) {
    if (file.size > MAX_FILE_BYTES) return FILE_TOO_LARGE_MESSAGE;
    if (!mimeTypeFor(file.name)) return UNSUPPORTED_FILE_MESSAGE;
  }
  const totalBytes = [...current, ...incoming].reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) return TOTAL_TOO_LARGE_MESSAGE;
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const match = DATA_URL_PATTERN.exec(String(reader.result ?? ''));
      if (!match) reject(new Error('Could not read file'));
      else resolve(match[1]);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export async function readStoredFile(file: File): Promise<StoredFile> {
  const mimeType = mimeTypeFor(file.name);
  if (!mimeType) throw new Error(UNSUPPORTED_FILE_MESSAGE);
  return { name: file.name, mimeType, base64: await readAsBase64(file) };
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function storedFileToFile(stored: StoredFile): File {
  return new File([base64ToBytes(stored.base64)], stored.name, { type: stored.mimeType });
}

export function storedFileText(stored: StoredFile): string {
  return new TextDecoder().decode(base64ToBytes(stored.base64));
}

export function buildPromptText(text: string, files: StoredFile[]): string {
  const attachedText = files
    .filter((file) => file.mimeType === 'text/plain')
    .map((file) => storedFileText(file).trim())
    .filter(Boolean);
  return [text, ...attachedText].filter(Boolean).join('\n\n');
}

export function toInlineFiles(files: StoredFile[]): InlineFile[] {
  return files
    .filter((file) => file.mimeType !== 'text/plain')
    .map((file) => ({ mimeType: file.mimeType, data: file.base64 }));
}

export function isSameFileList(a: File[], b: File[]): boolean {
  return (
    a.length === b.length &&
    a.every((file, index) => file.name === b[index].name && file.size === b[index].size)
  );
}

function isStoredFile(value: unknown): value is StoredFile {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.mimeType === 'string' &&
    typeof candidate.base64 === 'string'
  );
}

export function parseStoredFiles(value: unknown): StoredFile[] {
  if (!Array.isArray(value) || !value.every(isStoredFile)) {
    throw new Error('Unexpected file data');
  }
  return value;
}
