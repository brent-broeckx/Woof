// Woofdoku pup hunger reminders (Supabase Edge Function, Deno).
//
// POST { action: 'save', subscription, pupName, reminders }  -> replace this device's schedule
// POST { action: 'remove', endpoint }                         -> forget this device
// POST { action: 'send' } + header x-cron-secret              -> send due reminders (pg_cron)
//
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (base64url), VAPID_SUBJECT (mailto:...),
// PUSH_CRON_SECRET, optional ALLOWED_ORIGINS (comma separated). SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as webpush from 'jsr:@negrel/webpush@0.5';
import { parseRemoveBody, parseSaveBody, reminderMessage, STALE_AFTER_MS, type ReminderKind } from '../_shared/pushReminders.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '*').split(',').map((o) => o.trim());

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allow = allowedOrigins.includes('*') ? '*' : allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
}

const json = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });

/* ---------------- VAPID ---------------- */

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

const bytesToB64url = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

let appServer: Promise<webpush.ApplicationServer> | null = null;

function getAppServer(): Promise<webpush.ApplicationServer> {
  appServer ??= (async () => {
    const pub = b64urlToBytes(Deno.env.get('VAPID_PUBLIC_KEY')!);
    if (pub.length !== 65 || pub[0] !== 4) throw new Error('VAPID_PUBLIC_KEY must be an uncompressed P-256 key');
    const x = bytesToB64url(pub.slice(1, 33));
    const y = bytesToB64url(pub.slice(33, 65));
    const d = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidKeys = await webpush.importVapidKeys({
      publicKey: { kty: 'EC', crv: 'P-256', x, y, ext: true },
      privateKey: { kty: 'EC', crv: 'P-256', x, y, d, ext: true },
    });
    return webpush.ApplicationServer.new({ contactInformation: Deno.env.get('VAPID_SUBJECT') ?? 'mailto:woofdoku@example.com', vapidKeys });
  })();
  return appServer;
}

/* ---------------- Actions ---------------- */

async function save(body: unknown): Promise<string | null> {
  const parsed = parseSaveBody(body, Date.now());
  if (!parsed) return 'invalid request';
  const { subscription: sub, pupName, reminders } = parsed;
  const up = await db
    .from('push_subscriptions')
    .upsert({ endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, pup_name: pupName, updated_at: new Date().toISOString() });
  if (up.error) throw up.error;
  const del = await db.from('push_reminders').delete().eq('endpoint', sub.endpoint);
  if (del.error) throw del.error;
  if (reminders.length) {
    const ins = await db.from('push_reminders').insert(reminders.map((r) => ({ endpoint: sub.endpoint, kind: r.kind, send_at: new Date(r.at).toISOString() })));
    if (ins.error) throw ins.error;
  }
  return null;
}

async function remove(body: unknown): Promise<string | null> {
  const parsed = parseRemoveBody(body);
  if (!parsed) return 'invalid request';
  const del = await db.from('push_subscriptions').delete().eq('endpoint', parsed.endpoint);
  if (del.error) throw del.error;
  return null;
}

interface DueRow {
  id: number;
  kind: ReminderKind;
  send_at: string;
  push_subscriptions: { endpoint: string; p256dh: string; auth: string; pup_name: string };
}

async function sendDue(): Promise<{ sent: number; dropped: number; gone: number }> {
  const now = Date.now();
  const { data, error } = await db
    .from('push_reminders')
    .select('id, kind, send_at, push_subscriptions!inner(endpoint, p256dh, auth, pup_name)')
    .lte('send_at', new Date(now).toISOString())
    .order('send_at')
    .limit(500);
  if (error) throw error;
  const rows = (data ?? []) as unknown as DueRow[];
  if (!rows.length) return { sent: 0, dropped: 0, gone: 0 };

  // Claim the rows first so an overlapping cron run can't send them twice.
  const claimed = await db
    .from('push_reminders')
    .delete()
    .in(
      'id',
      rows.map((r) => r.id),
    );
  if (claimed.error) throw claimed.error;

  const server = await getAppServer();
  const gone = new Set<string>();
  let sent = 0;
  // Only the most urgent fresh reminder per device is worth sending.
  const pick = new Map<string, DueRow>();
  for (const r of rows) {
    if (now - Date.parse(r.send_at) > STALE_AFTER_MS) continue;
    const endpoint = r.push_subscriptions.endpoint;
    if (!pick.has(endpoint) || r.kind === 'starving') pick.set(endpoint, r);
  }
  const dropped = rows.length - pick.size;

  await Promise.all(
    [...pick.values()].map(async (r) => {
      const s = r.push_subscriptions;
      try {
        await server
          .subscribe({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } })
          .pushTextMessage(JSON.stringify(reminderMessage(r.kind, s.pup_name)), { ttl: 12 * 3600, topic: 'pup-hunger' });
        sent++;
      } catch (e) {
        const status = e instanceof webpush.PushMessageError ? e.response.status : 0;
        if (status === 404 || status === 410) gone.add(s.endpoint);
        else console.error('push failed', status, e);
      }
    }),
  );

  if (gone.size)
    await db
      .from('push_subscriptions')
      .delete()
      .in('endpoint', [...gone]);
  return { sent, dropped, gone: gone.size };
}

/* ---------------- Entry ---------------- */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(req, 400, { error: 'invalid json' });
  }
  const action = (body as { action?: unknown } | null)?.action;
  try {
    if (action === 'send') {
      const secret = Deno.env.get('PUSH_CRON_SECRET');
      if (!secret || req.headers.get('x-cron-secret') !== secret) return json(req, 401, { error: 'unauthorized' });
      return json(req, 200, await sendDue());
    }
    const error = action === 'save' ? await save(body) : action === 'remove' ? await remove(body) : 'unknown action';
    return error ? json(req, 400, { error }) : json(req, 200, { ok: true });
  } catch (e) {
    console.error(e);
    return json(req, 500, { error: 'server error' });
  }
});
