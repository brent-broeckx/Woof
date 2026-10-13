-- Pup hunger push reminders.
-- Clients never touch these tables directly: RLS is on with no policies, so only the
-- `push-reminders` Edge Function (service role) can read or write them.

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  pup_name text not null default 'Your pup',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_reminders (
  id bigint generated always as identity primary key,
  endpoint text not null references public.push_subscriptions (endpoint) on delete cascade,
  kind text not null check (kind in ('hungry', 'starving')),
  send_at timestamptz not null
);

create index if not exists push_reminders_send_at_idx on public.push_reminders (send_at);
create index if not exists push_reminders_endpoint_idx on public.push_reminders (endpoint);

alter table public.push_subscriptions enable row level security;
alter table public.push_reminders enable row level security;

revoke all on public.push_subscriptions from anon, authenticated;
revoke all on public.push_reminders from anon, authenticated;

-- Every 5 minutes, ask the Edge Function to send the reminders that are due.
-- The URL and shared secret live in Vault (see docs/12-pup-reminders.md), so nothing
-- project-specific is committed here.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'woofdoku-push-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/push-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
    ),
    body := '{"action":"send"}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
