import { describe, expect, it } from 'vitest';
import {
  cleanPupName,
  isAllowedEndpoint,
  MAX_AHEAD_MS,
  parseRemoveBody,
  parseSaveBody,
  reminderMessage,
} from '../../../supabase/functions/_shared/pushReminders';
import { createPup, currentFullness, feedPup, HOUR, moodFor, shiftPupTime } from './pup';
import { crossesBelowAt, deferForQuietHours, HUNGRY_BELOW, planReminders, STARVING_BELOW } from './reminders';

// 2023-11-14 22:13:20 UTC. Tests use fixed UTC offsets so they don't depend on the machine's zone.
const T0 = 1_700_000_000_000;
const DAY = 24 * HOUR;
const utc = () => 0;
const brussels = () => 60;
/** Epoch ms for an hour:minute on the UTC day of T0, shifted by `days`. */
const at = (hour: number, minute = 0, days = 0) => Math.floor(T0 / DAY) * DAY + days * DAY + hour * HOUR + minute * 60_000;
const localHour = (ms: number, offsetMin: number) => new Date(ms + offsetMin * 60_000).getUTCHours();

describe('reminder planning', () => {
  it('finds the moment fullness crosses a threshold', () => {
    const pup = { fullness: 100, fullnessAt: at(9) };
    const hungry = crossesBelowAt(pup, HUNGRY_BELOW, at(9))!;
    expect(moodFor(currentFullness(pup, hungry - 2 * 60_000))).toBe('content');
    expect(moodFor(currentFullness(pup, hungry))).toBe('hungry');
    const starving = crossesBelowAt(pup, STARVING_BELOW, at(9))!;
    expect(moodFor(currentFullness(pup, starving))).toBe('sad');
    expect(crossesBelowAt({ fullness: 30, fullnessAt: at(9) }, HUNGRY_BELOW, at(9))).toBeNull();
  });

  it('leaves daytime alone and moves quiet hours to 08:00', () => {
    expect(deferForQuietHours(at(14, 30), utc)).toBe(at(14, 30));
    expect(deferForQuietHours(at(23), utc)).toBe(at(8, 0, 1));
    expect(deferForQuietHours(at(3), utc)).toBe(at(8));
    expect(deferForQuietHours(at(22), utc)).toBe(at(8, 0, 1));
    expect(deferForQuietHours(at(7, 59), utc)).toBe(at(8));
  });

  it('respects the local time zone', () => {
    // 21:30 UTC is 22:30 in Brussels (UTC+1): quiet, so wait for 08:00 Brussels = 07:00 UTC.
    expect(deferForQuietHours(at(21, 30), brussels)).toBe(at(7, 0, 1));
    expect(localHour(deferForQuietHours(at(5), brussels), 60)).toBe(8);
  });

  it('plans hungry then starving for a fed pup', () => {
    const pup = { fullness: 100, fullnessAt: at(8) };
    const plan = planReminders(pup, at(8), utc);
    expect(plan.map((r) => r.kind)).toEqual(['hungry', 'starving']);
    // 60 points at 100/30 per hour = 18 h -> 02:00, deferred to 08:00 the next day.
    expect(plan[0].at).toBe(at(8, 0, 1));
    // 85 points = 25.5 h -> 09:31 the next day.
    expect(plan[1].at).toBeCloseTo(at(9, 31, 1), -3);
  });

  it('keeps only "starving" when quiet hours squash both into one morning', () => {
    // Hungry at ~23:01, starving at ~06:31: both land on 08:00.
    const pup = { fullness: 40 + (100 / 30) * 8, fullnessAt: at(15) };
    const plan = planReminders(pup, at(15), utc);
    expect(plan).toEqual([{ kind: 'starving', at: at(8, 0, 1) }]);
  });

  it('plans nothing once the pup is already starving, and only "starving" when already hungry', () => {
    expect(planReminders({ fullness: 10, fullnessAt: at(12) }, at(12), utc)).toEqual([]);
    expect(planReminders({ fullness: 30, fullnessAt: at(12) }, at(12), utc).map((r) => r.kind)).toEqual(['starving']);
  });

  it('moves reminders later after feeding', () => {
    const pup = createPup('Rex', 'corgi', at(10));
    const before = planReminders(pup, at(10), utc);
    const later = at(16);
    const after = planReminders(feedPup(pup, later), later, utc);
    expect(after[after.length - 1].at).toBeGreaterThan(before[before.length - 1].at);
  });

  it('ignores clock skew from debug time travel (past slots are dropped)', () => {
    const pup = shiftPupTime(createPup('Rex', 'corgi', at(10)), 20 * HOUR);
    const plan = planReminders(pup, at(10), utc);
    expect(plan.every((r) => r.at > at(10))).toBe(true);
  });
});

describe('push payload validation', () => {
  const p256dh = 'B' + 'A'.repeat(86);
  const auth = 'abcdefghijklmnopqrstuv';
  const fcm = 'https://fcm.googleapis.com/fcm/send/abc123';
  const body = (over: Record<string, unknown> = {}) => ({
    action: 'save',
    subscription: { endpoint: fcm, keys: { p256dh, auth } },
    pupName: 'Rex',
    reminders: [{ kind: 'hungry', at: T0 + HOUR }],
    ...over,
  });

  it('only allows known push services over https', () => {
    expect(isAllowedEndpoint(fcm)).toBe(true);
    expect(isAllowedEndpoint('https://web.push.apple.com/QGx')).toBe(true);
    expect(isAllowedEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x')).toBe(true);
    expect(isAllowedEndpoint('https://wns2-par02p.notify.windows.com/w/?token=x')).toBe(true);
    expect(isAllowedEndpoint('http://fcm.googleapis.com/fcm/send/x')).toBe(false);
    expect(isAllowedEndpoint('https://fcm.googleapis.com:8443/x')).toBe(false);
    expect(isAllowedEndpoint('https://evil.example/fcm.googleapis.com')).toBe(false);
    expect(isAllowedEndpoint('https://fcm.googleapis.com.evil.example/x')).toBe(false);
    expect(isAllowedEndpoint('https://notpush.apple.com.evil/x')).toBe(false);
    expect(isAllowedEndpoint(42)).toBe(false);
  });

  it('accepts a valid save and drops past slots', () => {
    const parsed = parseSaveBody(
      body({
        reminders: [
          { kind: 'hungry', at: T0 - 1 },
          { kind: 'starving', at: T0 + 2 * HOUR },
        ],
      }),
      T0,
    );
    expect(parsed?.reminders).toEqual([{ kind: 'starving', at: T0 + 2 * HOUR }]);
    expect(parsed?.pupName).toBe('Rex');
  });

  it('rejects bad keys, kinds, too many or too-far reminders', () => {
    expect(parseSaveBody(body({ subscription: { endpoint: fcm, keys: { p256dh: 'short', auth } } }), T0)).toBeNull();
    expect(parseSaveBody(body({ subscription: { endpoint: 'https://example.com', keys: { p256dh, auth } } }), T0)).toBeNull();
    expect(parseSaveBody(body({ reminders: [{ kind: 'party', at: T0 + HOUR }] }), T0)).toBeNull();
    expect(parseSaveBody(body({ reminders: Array.from({ length: 5 }, () => ({ kind: 'hungry', at: T0 + HOUR })) }), T0)).toBeNull();
    expect(parseSaveBody(body({ reminders: [{ kind: 'hungry', at: T0 + MAX_AHEAD_MS + 1 }] }), T0)).toBeNull();
    expect(parseSaveBody(body({ action: 'remove' }), T0)).toBeNull();
    expect(parseSaveBody(null, T0)).toBeNull();
  });

  it('parses remove requests', () => {
    expect(parseRemoveBody({ action: 'remove', endpoint: fcm })).toEqual({ action: 'remove', endpoint: fcm });
    expect(parseRemoveBody({ action: 'remove', endpoint: 'https://example.com' })).toBeNull();
  });

  it('cleans pup names and builds messages', () => {
    expect(cleanPupName('  <b>Rex</b>\u0007  ')).toBe('bRex/b');
    expect(cleanPupName('')).toBe('Your pup');
    expect(cleanPupName('A very long pup name indeed')).toHaveLength(16);
    expect(reminderMessage('hungry', 'Rex').title).toContain('Rex');
    expect(reminderMessage('starving', 'Rex').url).toBe('./?open=pup');
  });
});
