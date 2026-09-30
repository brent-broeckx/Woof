import { hashSeed } from '../rng';

/** Local calendar date as YYYY-MM-DD. */
export function dateKey(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function previousDateKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d - 1));
}

export interface DailyConfig {
  date: string;
  size: number;
  maxDifficulty: number;
  seed: number;
  label: string;
}

/** Monday is gentle, weekends are big. */
const WEEKDAY: { size: number; maxDifficulty: number; label: string }[] = [
  { size: 9, maxDifficulty: 6, label: 'Sunday Challenge' },
  { size: 6, maxDifficulty: 3, label: 'Easy Monday' },
  { size: 7, maxDifficulty: 4, label: 'Tuesday Trot' },
  { size: 7, maxDifficulty: 5, label: 'Wednesday Walk' },
  { size: 8, maxDifficulty: 4, label: 'Thursday Fetch' },
  { size: 8, maxDifficulty: 5, label: 'Friday Frisbee' },
  { size: 9, maxDifficulty: 5, label: 'Saturday Stroll' },
];

export function dailyConfig(date: string): DailyConfig {
  const [y, m, d] = date.split('-').map(Number);
  const w = WEEKDAY[new Date(y, m - 1, d).getDay()];
  return { date, ...w, seed: hashSeed('daily', date) };
}

export interface DailyRecord {
  lastDate: string | null;
  streak: number;
  best: number;
  completed: Record<string, number>;
}

export const emptyDaily = (): DailyRecord => ({ lastDate: null, streak: 0, best: 0, completed: {} });

/** Apply a finished daily puzzle. Replays of the same day don't change the streak. */
export function applyDailyCompletion(record: DailyRecord, date: string, stars: number): { record: DailyRecord; firstTime: boolean } {
  const firstTime = !(date in record.completed);
  const completed = { ...record.completed, [date]: Math.max(record.completed[date] ?? 0, stars) };
  if (!firstTime) return { record: { ...record, completed }, firstTime };
  const streak = record.lastDate === previousDateKey(date) ? record.streak + 1 : 1;
  return { record: { lastDate: date, streak, best: Math.max(record.best, streak), completed }, firstTime };
}

/** Streak shown to the player: broken if yesterday's daily was missed. */
export function currentStreak(record: DailyRecord, today: string = dateKey()): number {
  if (record.lastDate === today || record.lastDate === previousDateKey(today)) return record.streak;
  return 0;
}

export const ENDLESS_DIFFICULTY = {
  easy: { label: 'Easy', maxDifficulty: 2 },
  medium: { label: 'Medium', maxDifficulty: 4 },
  hard: { label: 'Hard', maxDifficulty: 6 },
} as const;

export type EndlessDifficulty = keyof typeof ENDLESS_DIFFICULTY;
