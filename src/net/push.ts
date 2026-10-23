/**
 * Web Push for pup hunger reminders. The browser subscribes with our VAPID key and we
 * hand the push server a small schedule ("hungry at X, starving at Y"). The server
 * sends them even when the app is closed. No account needed: the push endpoint is
 * the device's identity.
 */
import type { PupState } from '../core/pet/pup';
import { planReminders } from '../core/pet/reminders';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '');
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const NOTIFICATION_TAG = 'pup-hunger';

/** False when the build has no push server configured: all reminder UI is hidden. */
export const remindersConfigured = Boolean(SUPABASE_URL && VAPID_KEY);

/**
 * - `install`: iPhone/iPad only allow web push from a Home Screen app.
 * - `denied`: the user (or OS) blocked notifications for this site.
 */
export type ReminderStatus = 'available' | 'unconfigured' | 'unsupported' | 'install' | 'denied';
export type EnableResult = 'ok' | 'denied' | 'install' | 'unsupported' | 'error';

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

export function reminderStatus(): ReminderStatus {
  if (!remindersConfigured) return 'unconfigured';
  if (isIOS() && !isStandalone()) return 'install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return 'available';
}

export const permissionGranted = () => reminderStatus() === 'available' && Notification.permission === 'granted';

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** The service worker registration, or null when there is none (e.g. `npm run dev`). */
async function swRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

const sameKey = (a: ArrayBuffer | null | undefined, b: Uint8Array) => !!a && a.byteLength === b.length && new Uint8Array(a).every((v, i) => v === b[i]);

async function getSubscription(create: boolean): Promise<PushSubscription | null> {
  const reg = await swRegistration();
  if (!reg) return null;
  const key = b64urlToBytes(VAPID_KEY!);
  const existing = await reg.pushManager.getSubscription();
  // A subscription made with an older VAPID key can't receive our pushes any more.
  if (existing && sameKey(existing.options.applicationServerKey, key)) return existing;
  if (!create) return existing;
  await existing?.unsubscribe();
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
}

async function post(body: unknown): Promise<boolean> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (PUBLISHABLE_KEY) headers.apikey = PUBLISHABLE_KEY;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/push-reminders`, { method: 'POST', headers, body: JSON.stringify(body), keepalive: true });
    return res.ok;
  } catch {
    return false;
  }
}

function sendSchedule(sub: PushSubscription, pup: PupState, now: number): Promise<boolean> {
  return post({ action: 'save', subscription: sub.toJSON(), pupName: pup.name, reminders: planReminders(pup, now) });
}

/** Asks for permission (call from a tap), subscribes and uploads the schedule. */
export async function enableReminders(pup: PupState): Promise<EnableResult> {
  const status = reminderStatus();
  if (status === 'unconfigured') return 'unsupported';
  if (status !== 'available') return status;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  try {
    const sub = await getSubscription(true);
    if (!sub) return 'unsupported';
    return (await sendSchedule(sub, pup, Date.now())) ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

/** Re-uploads the schedule after the pup changes (fed, renamed, time travel). */
export async function syncReminders(pup: PupState, now = Date.now()): Promise<boolean> {
  if (!permissionGranted()) return false;
  try {
    const sub = await getSubscription(true);
    return !!sub && (await sendSchedule(sub, pup, now));
  } catch {
    return false;
  }
}

/** Forgets this device on the server and drops the browser subscription. */
export async function disableReminders(): Promise<void> {
  if (!remindersConfigured) return;
  try {
    const sub = await getSubscription(false);
    if (!sub) return;
    await post({ action: 'remove', endpoint: sub.endpoint });
    await sub.unsubscribe();
  } catch {
    /* best effort */
  }
}

/** Closes hunger notifications that are still in the tray once the player is back. */
export async function clearShownReminders(): Promise<void> {
  if (!permissionGranted()) return;
  const reg = await swRegistration();
  const shown = (await reg?.getNotifications({ tag: NOTIFICATION_TAG })) ?? [];
  for (const n of shown) n.close();
}
