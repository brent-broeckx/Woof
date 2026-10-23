/**
 * When to nudge the player about a hungry pup. Fullness drains linearly, so the
 * moments it crosses the mood thresholds are known in advance and can be handed to
 * the push server as a schedule. Nothing here touches the clock or the browser.
 */
import type { ReminderSlot } from '../../../supabase/functions/_shared/pushReminders';
import { DECAY_PER_HOUR, HOUR, type PupState } from './pup';

export type { ReminderKind, ReminderSlot } from '../../../supabase/functions/_shared/pushReminders';

/** Below these, `moodFor` reports "hungry" and "sad" (starving). */
export const HUNGRY_BELOW = 40;
export const STARVING_BELOW = 15;
/** No notifications between 22:00 and 08:00 local time. */
export const QUIET_START_HOUR = 22;
export const QUIET_END_HOUR = 8;
/** Fire a minute after crossing, so the mood has really changed when the app opens. */
const MARGIN = 60_000;
const DAY = 24 * HOUR;

/** Minutes east of UTC at the given moment (e.g. +120 for Brussels in summer). */
export type OffsetFn = (at: number) => number;
export const localOffset: OffsetFn = (at) => -new Date(at).getTimezoneOffset();

/** The moment fullness drops below `threshold`, or null if it already has by `now`. */
export function crossesBelowAt(pup: Pick<PupState, 'fullness' | 'fullnessAt'>, threshold: number, now: number): number | null {
  const at = pup.fullnessAt + ((pup.fullness - threshold) / DECAY_PER_HOUR) * HOUR + MARGIN;
  return at > now ? at : null;
}

/** Moves a time that falls in quiet hours to the next 08:00 local time. */
export function deferForQuietHours(at: number, offsetFor: OffsetFn = localOffset): number {
  const offset = offsetFor(at) * 60_000;
  const local = at + offset;
  const hour = new Date(local).getUTCHours();
  if (hour >= QUIET_END_HOUR && hour < QUIET_START_HOUR) return at;
  const dayStart = Math.floor(local / DAY) * DAY;
  const wake = dayStart + QUIET_END_HOUR * HOUR + (hour >= QUIET_START_HOUR ? DAY : 0);
  return wake - offset;
}

/**
 * The upcoming "hungry" and "starving" reminders for this pup. If quiet hours push
 * both to the same morning, only the more urgent "starving" one is kept.
 */
export function planReminders(pup: Pick<PupState, 'fullness' | 'fullnessAt'>, now: number, offsetFor: OffsetFn = localOffset): ReminderSlot[] {
  const plan: ReminderSlot[] = [];
  const hungry = crossesBelowAt(pup, HUNGRY_BELOW, now);
  const starving = crossesBelowAt(pup, STARVING_BELOW, now);
  if (hungry !== null) plan.push({ kind: 'hungry', at: deferForQuietHours(hungry, offsetFor) });
  if (starving !== null) {
    const at = deferForQuietHours(starving, offsetFor);
    if (plan.length && plan[0].at >= at) plan.length = 0;
    plan.push({ kind: 'starving', at });
  }
  return plan;
}
