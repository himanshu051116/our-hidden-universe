import test from 'node:test';
import assert from 'node:assert/strict';
import {
  timestampMs, readyMembers, getCommandDelay, commandPlaybackPosition,
  estimatedSharedTime, driftCorrection,
} from '../src/services/watchSyncMath.js';

test('readiness requires two fresh distinct members of the same session', () => {
  const now = 1_700_000_100_000;
  const ready = {
    me: { ready: true, sessionId: 'movieA', seenAt: { seconds: now / 1000 - 8 } },
    partner: { ready: true, sessionId: 'movieA', seenAt: { seconds: now / 1000 - 5 } },
    old: { ready: true, sessionId: 'movieB', seenAt: now - 100 },
    stale: { ready: true, sessionId: 'movieA', seenAt: now - 52_000 },
  };
  assert.deepEqual(readyMembers(ready, 'movieA', now).sort(), ['me', 'partner']);
  assert.deepEqual(readyMembers(ready, 'movieB', now), ['old']);
  assert.deepEqual(readyMembers(ready, 'movieC', now), []);
  assert.deepEqual(readyMembers(null, 'movieA', now), []);
  assert.deepEqual(readyMembers(ready, '', now), []);
  assert.equal(timestampMs({ toMillis() { return 1200; } }), 1200);
});

test('late commands run at remaining countdown, not another full delay', () => {
  const now = 1_700_000_100_000;
  const command = { action: 'play', currentTime: 20, committedAt: now - 1100, delayMs: 3000 };
  assert.equal(getCommandDelay(command, now), 1900);
  assert.equal(getCommandDelay(command, now + 4000), 0);
  assert.equal(commandPlaybackPosition(command, now + 4000), 22.1);
  assert.equal(commandPlaybackPosition({ ...command, action: 'pause' }, now + 4000), 20);
});

test('recovered playback command catches up late viewers without huge jumps', () => {
  const now = 1_700_000_100_000;
  const command = { action: 'play', currentTime: 8, committedAt: now - 120_000, delayMs: 2000 };
  assert.equal(commandPlaybackPosition(command, now), 16);
});

test('fresh server-side samples extrapolate play but not pause or buffering', () => {
  const now = 1_700_000_100_000;
  const sync = { currentTime: 12.2, sampledAt: { seconds: now / 1000 - 2 }, playing: true, buffering: false };
  assert.equal(estimatedSharedTime(sync, now), 14.2);
  assert.equal(estimatedSharedTime({ ...sync, playing: false }, now), 12.2);
  assert.equal(estimatedSharedTime({ ...sync, buffering: true }, now), 12.2);
  assert.equal(estimatedSharedTime({ ...sync, sampledAt: now - 15_000 }, now), null);
  assert.equal(estimatedSharedTime({ currentTime: NaN }, now), null);
});

test('small native-video drift gets rate adjustment, large drift seeks', () => {
  assert.equal(driftCorrection(10.1, 10, true).kind, 'none');
  const moderate = driftCorrection(12.0, 11.3, true);
  assert.equal(moderate.kind, 'rate');
  assert.ok(moderate.rate > 1 && moderate.rate <= 1.06);
  const big = driftCorrection(18, 15, true);
  assert.equal(big.kind, 'seek');
  assert.equal(big.position, 18);
  assert.equal(driftCorrection(18, 17.2, false).kind, 'seek');
  assert.equal(driftCorrection(null, NaN).kind, 'none');
});
