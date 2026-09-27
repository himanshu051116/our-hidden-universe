import test from 'node:test';
import assert from 'node:assert/strict';
import { qualityFromMetrics } from '../src/services/callDiagnosticsService.js';

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
