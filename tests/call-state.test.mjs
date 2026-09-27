import test from 'node:test';
import assert from 'node:assert/strict';
import { callCanTransition } from '../src/calls/callState.js';

test('caller may move creating to ringing', () => {
  assert.equal(callCanTransition('creating', 'ringing', 'caller'), true);
});

test('callee may not create the ringing state', () => {
  assert.equal(callCanTransition('creating', 'ringing', 'callee'), false);
});

test('callee may answer a ringing call', () => {
  assert.equal(callCanTransition('ringing', 'connecting', 'callee'), true);
});

test('caller may not manufacture an answer transition', () => {
  assert.equal(callCanTransition('ringing', 'connecting', 'caller'), false);
});

test('both sides may enter reconnecting from connected', () => {
  assert.equal(callCanTransition('connected', 'reconnecting', 'caller'), true);
  assert.equal(callCanTransition('connected', 'reconnecting', 'callee'), true);
});

test('terminal call may not return to connected', () => {
  assert.equal(callCanTransition('ended', 'connected', 'caller'), false);
});
