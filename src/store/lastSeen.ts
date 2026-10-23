// "Last seen" lives in its own key so hiding the page never rewrites the whole save
// (which could clobber changes made by another tab).
const KEY = 'woofdoku-last-seen';

function read(): number | null {
  try {
    const v = Number(localStorage.getItem(KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

function write(t: number) {
  try {
    localStorage.setItem(KEY, String(t));
  } catch {
    // Storage unavailable; the greeting simply won't show.
  }
}

/** Marks the player as seen now and returns how long they were away (ms). */
export function touchLastSeen(now = Date.now()): number {
  const prev = read();
  write(now);
  return prev === null ? 0 : Math.max(0, now - prev);
}

export function shiftLastSeen(ms: number) {
  const prev = read();
  if (prev !== null) write(prev - ms);
}
