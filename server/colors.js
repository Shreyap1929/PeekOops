// Keys must match the accent tokens defined in client/src/styles.css
export const ACCENT_KEYS = ['coral', 'sky', 'sage', 'sunshine', 'lilac'];

export function colorForIndex(i) {
  return ACCENT_KEYS[i % ACCENT_KEYS.length];
}
