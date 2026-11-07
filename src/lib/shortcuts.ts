export function isPrimaryShortcut(event: KeyboardEvent): boolean {
  if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return false;
  return !(event.target instanceof Element && event.target.closest('button, a, input, textarea, select'));
}
