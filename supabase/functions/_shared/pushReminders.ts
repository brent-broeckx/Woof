/**
 * Pure helpers shared by the `push-reminders` Edge Function and the client tests.
 * No Deno or browser APIs here, so Vitest can import this file directly.
 */

export type ReminderKind = 'hungry' | 'starving';

export interface ReminderSlot {
  kind: ReminderKind;
  /** Epoch ms when the notification should go out. */
  at: number;
}

export interface SubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface SaveRemindersBody {
  action: 'save';
  subscription: SubscriptionInput;
  pupName: string;
  reminders: ReminderSlot[];
}

export interface RemoveRemindersBody {
  action: 'remove';
  endpoint: string;
}

export const MAX_PUP_NAME = 16;
export const MAX_REMINDERS = 4;
/** Reminders further out than this are rejected (a full pup gets hungry in ~1.5 days). */
export const MAX_AHEAD_MS = 7 * 24 * 3_600_000;
/** Reminders the cron missed by more than this are dropped instead of sent late. */
export const STALE_AFTER_MS = 6 * 3_600_000;

/**
 * Push services we are willing to POST to. Without this list the function could be
 * abused to send requests to any URL.
 */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/];

export function isAllowedEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== 'string' || endpoint.length > 1024) return false;
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:' && !url.port && PUSH_HOSTS.some((re) => re.test(url.hostname));
  } catch {
    return false;
  }
}

const B64URL = /^[A-Za-z0-9_-]+={0,2}$/;
const isKey = (v: unknown, min: number, max: number): v is string => typeof v === 'string' && v.length >= min && v.length <= max && B64URL.test(v);

const isPrintable = (ch: string) => ch >= ' ' && ch !== '\u007f' && ch !== '<' && ch !== '>';

export function cleanPupName(name: unknown): string {
  if (typeof name !== 'string') return 'Your pup';
  const clean = [...name].filter(isPrintable).join('').replace(/\s+/g, ' ').trim().slice(0, MAX_PUP_NAME);
  return clean || 'Your pup';
}

/** Validates the client's "save" request. Returns null when anything is off. */
export function parseSaveBody(body: unknown, now: number): SaveRemindersBody | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const sub = b.subscription as Record<string, unknown> | undefined;
  const keys = sub?.keys as Record<string, unknown> | undefined;
  if (b.action !== 'save' || !sub || !keys || !isAllowedEndpoint(sub.endpoint)) return null;
  if (!isKey(keys.p256dh, 80, 100) || !isKey(keys.auth, 16, 32)) return null;
  if (!Array.isArray(b.reminders) || b.reminders.length > MAX_REMINDERS) return null;
  const reminders: ReminderSlot[] = [];
  for (const r of b.reminders as unknown[]) {
    const { kind, at } = (r ?? {}) as Record<string, unknown>;
    if ((kind !== 'hungry' && kind !== 'starving') || typeof at !== 'number' || !Number.isFinite(at)) return null;
    if (at > now + MAX_AHEAD_MS) return null;
    if (at > now) reminders.push({ kind, at: Math.round(at) });
  }
  return {
    action: 'save',
    subscription: { endpoint: sub.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
    pupName: cleanPupName(b.pupName),
    reminders,
  };
}

export function parseRemoveBody(body: unknown): RemoveRemindersBody | null {
  const b = (body ?? {}) as Record<string, unknown>;
  return b.action === 'remove' && isAllowedEndpoint(b.endpoint) ? { action: 'remove', endpoint: b.endpoint } : null;
}

export interface PushMessage {
  title: string;
  body: string;
  tag: string;
  url: string;
}

export function reminderMessage(kind: ReminderKind, pupName: string): PushMessage {
  const name = cleanPupName(pupName);
  const url = './?open=pup';
  return kind === 'hungry'
    ? { title: `${name} is getting hungry 🥣`, body: `${name} keeps staring at the food bowl. Solve a puzzle and grab some kibble!`, tag: 'pup-hunger', url }
    : { title: `${name} is starving! 😢`, body: `${name} really misses you. Come back for a quick puzzle and a full bowl.`, tag: 'pup-hunger', url };
}
