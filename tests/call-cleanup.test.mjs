import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCallForCleanup } from '../api/_callCleanupPolicy.js';

const now = Date.parse('2026-10-14T00:00:00Z');
const before = (ms) => new Date(now - ms);

test('expired ringing call becomes a missed-call cleanup candidate', () => {
  assert.deepEqual(classifyCallForCleanup({
    _kind: 'call', status: 'ringing', expiresAt: before(1000),
  }, now), { remove: true, historyResult: 'missed' });
});

test('fresh ringing call remains intact', () => {
  const future = new Date(now + 20000);
  assert.equal(classifyCallForCleanup({
    _kind: 'call', status: 'ringing', expiresAt: future,
  }, now).remove, false);
});

test('old terminal calls are removed after the grace period', () => {
  assert.deepEqual(classifyCallForCleanup({
    _kind: 'call', status: 'ended', endedAt: before(2 * 60 * 60 * 1000),
  }, now), { remove: true, historyResult: null });
});

test('connected call with null expiry is not deleted', () => {
  assert.equal(classifyCallForCleanup({
    _kind: 'call', status: 'connected', expiresAt: null, createdAt: before(10000),
  }, now).remove, false);
});

test('never classify watch-party or historical records as calls', () => {
  assert.equal(classifyCallForCleanup({
    _kind: 'callHistory', status: 'ringing', expiresAt: before(10000),
  }, now).remove, false);
  assert.equal(classifyCallForCleanup(null, now).remove, false);
});

test('timestamp-like Firestore objects can be classified', () => {
  const x = classifyCallForCleanup({
    _kind: 'call', status: 'creating',
    createdAt: { seconds: Math.floor((now - 7200000) / 1000) },
  }, now);
  assert.deepEqual(x, { remove: true, historyResult: 'failed' });
});

test('abandoned connected call is purged only after three days', () => {
  const recent = classifyCallForCleanup({
    _kind: 'call', status: 'connected', createdAt: before(2 * 24 * 60 * 60 * 1000),
  }, now);
  const abandoned = classifyCallForCleanup({
    _kind: 'call', status: 'reconnecting', createdAt: before(4 * 24 * 60 * 60 * 1000),
  }, now);
  assert.equal(recent.remove, false);
  assert.equal(abandoned.remove, true);
});
