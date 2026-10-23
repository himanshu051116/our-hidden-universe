import test from 'node:test';
import assert from 'node:assert/strict';
import { qualityFromMetrics, sampleCallDiagnostics } from '../src/services/callDiagnosticsService.js';

test('unknown network quality before metrics arrive', () => {
  assert.equal(
    qualityFromMetrics({ rttMs: null, jitterMs: null, packetLossPct: null }),
    'unknown',
  );
});

test('excellent network quality', () => {
  assert.equal(
    qualityFromMetrics({ rttMs: 70, jitterMs: 8, packetLossPct: 0.2 }),
    'excellent',
  );
});

test('good network quality', () => {
  assert.equal(
    qualityFromMetrics({ rttMs: 180, jitterMs: 25, packetLossPct: 1.5 }),
    'good',
  );
});

test('fair network quality', () => {
  assert.equal(
    qualityFromMetrics({ rttMs: 340, jitterMs: 55, packetLossPct: 5 }),
    'fair',
  );
});

test('poor network quality', () => {
  assert.equal(
    qualityFromMetrics({ rttMs: 600, jitterMs: 110, packetLossPct: 12 }),
    'poor',
  );
});


test('quality uses recent packet loss instead of stale lifetime loss', async () => {
  const originalNow = Date.now;
  const initialNow = originalNow();
  let time = initialNow;
  Date.now = () => time;
  let packetsReceived = 500;
  let packetsLost = 50;
  const peer = {
    getStats: async () => new Map([
      ['incoming', {
        type: 'inbound-rtp', kind: 'video', bytesReceived: 300000,
        packetsReceived, packetsLost, jitter: 0.006,
      }],
      ['pair', {
        type: 'candidate-pair', state: 'succeeded', nominated: true,
        currentRoundTripTime: 0.06,
      }],
    ]),
  };
  try {
    const first = await sampleCallDiagnostics(peer);
    assert.equal(first.sample.packetLossPct, null, 'first sample has no observation window');
    packetsReceived += 100;
    time += 2500;
    const second = await sampleCallDiagnostics(peer, first);
    assert.equal(second.sample.packetLossPct, 0, 'past losses must not keep connection poor');
    assert.equal(second.sample.quality, 'excellent');

    packetsReceived += 80;
    packetsLost += 20;
    time += 2500;
    const third = await sampleCallDiagnostics(peer, second);
    assert.equal(third.sample.packetLossPct, 20);
    assert.equal(third.sample.quality, 'poor');

    packetsReceived = 1;
    packetsLost = 0; // stats reset after ICE restart
    time += 2500;
    const reset = await sampleCallDiagnostics(peer, third);
    assert.equal(reset.sample.packetLossPct, null);
  } finally {
    Date.now = originalNow;
  }
});
