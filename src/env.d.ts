/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL, e.g. https://xyz.supabase.co. Push reminders stay hidden without it. */
  readonly VITE_SUPABASE_URL?: string;
  /** Public anon/publishable key (safe to ship; RLS protects the data). */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** VAPID public key (base64url) from `npm run vapid-keys`. */
  readonly VITE_VAPID_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
