import { useEffect, useRef, useState } from 'react';
import {
  clearShownReminders,
  disableReminders,
  enableReminders,
  permissionGranted,
  reminderStatus,
  remindersConfigured,
  syncReminders,
  type EnableResult,
} from '../../net/push';
import { useSave } from '../../store/saveStore';

export const REMINDER_TIP = 'pupReminders';

const MESSAGES: Record<Exclude<EnableResult, 'ok'>, string> = {
  install: 'On iPhone and iPad, add Woofdoku to your Home Screen first (Share → Add to Home Screen), then turn this on in the installed app.',
  denied: 'Notifications are blocked for Woofdoku. Allow them in your browser or phone settings, then try again.',
  unsupported: "This browser can't show reminders. Try Chrome, Edge, Firefox or the installed app.",
  error: "Couldn't reach the reminder server. Check your connection and try again.",
};

/**
 * Keeps the server's schedule in step with the pup. Mount once (in App): it re-uploads
 * after feeding or renaming, and unsubscribes when reminders get switched off
 * (toggle, reset or importing a save).
 */
export function usePupRemindersSync(): void {
  const enabled = useSave((s) => s.settings.pupReminders);
  const key = useSave((s) => (s.pup ? `${s.pup.fullness}|${s.pup.fullnessAt}|${s.pup.name}` : ''));
  const wasEnabled = useRef(enabled);

  useEffect(() => {
    if (!remindersConfigured) return;
    const turnedOff = wasEnabled.current && !enabled;
    wasEnabled.current = enabled;
    if (turnedOff) {
      void disableReminders();
      return;
    }
    if (!enabled || !key) return;
    if (reminderStatus() === 'denied') {
      useSave.getState().updateSettings({ pupReminders: false });
      return;
    }
    const id = window.setTimeout(() => {
      const pup = useSave.getState().pup;
      if (pup) void syncReminders(pup);
    }, 1500);
    return () => window.clearTimeout(id);
  }, [enabled, key]);

  useEffect(() => {
    if (!remindersConfigured) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') void clearShownReminders();
    };
    onVisible();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
}

export interface ReminderToggle {
  /** Hide all reminder UI when false. */
  available: boolean;
  /** Turned on and allowed by the browser. */
  on: boolean;
  busy: boolean;
  message: string | null;
  setOn(on: boolean): Promise<boolean>;
}

/** Shared logic for the Settings switch and the Pup screen prompt. */
export function useReminderToggle(): ReminderToggle {
  const enabled = useSave((s) => s.settings.pupReminders);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(() => (enabled && !permissionGranted() ? hint() : null));

  const setOn = async (on: boolean) => {
    const save = useSave.getState();
    setMessage(null);
    if (!on) {
      save.updateSettings({ pupReminders: false });
      return true;
    }
    if (!save.pup) return false;
    setBusy(true);
    const result = await enableReminders(save.pup);
    setBusy(false);
    save.markTip(REMINDER_TIP);
    if (result !== 'ok') {
      setMessage(MESSAGES[result]);
      save.updateSettings({ pupReminders: false });
      return false;
    }
    save.updateSettings({ pupReminders: true });
    return true;
  };

  return { available: remindersConfigured, on: enabled && permissionGranted(), busy, message, setOn };
}

function hint(): string | null {
  const status = reminderStatus();
  return status === 'available' || status === 'unconfigured' ? null : MESSAGES[status];
}
