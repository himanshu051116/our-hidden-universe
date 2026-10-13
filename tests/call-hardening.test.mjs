import test from 'node:test';
import assert from 'node:assert/strict';
import { callCollectionPath, callDocumentPath } from '../src/services/callPaths.js';
import { validateIceServers } from '../src/services/iceServerConfig.js';

test('push and signaling use the deployed compatibility collection', () => {
  assert.equal(callCollectionPath('ABCD1234'), 'couples/ABCD1234/watchParty');
  assert.equal(callDocumentPath('ABCD1234', 'call-1'), 'couples/ABCD1234/watchParty/call-1');
});

test('accepts well-formed STUN and authenticated TURN entries', () => {
  assert.deepEqual(validateIceServers([
    { urls: 'stun:stun.example.net:3478' },
    { urls: ['turn:relay.example.net:3478', 'turns:relay.example.net:5349'], username: 'u', credential: 'p' },
  ]), [
    { urls: ['stun:stun.example.net:3478'] },
    { urls: ['turn:relay.example.net:3478', 'turns:relay.example.net:5349'], username: 'u', credential: 'p' },
  ]);
});

test('never passes unauthenticated relay or untrusted schemes to WebRTC', () => {
  assert.deepEqual(validateIceServers([
    { urls: 'turn:relay.example.net:3478' },
    { urls: ['https://phishing.example', 'stun:stun.example.org:3478', 'turn:relay.example.net:3478'] },
    { urls: 'stun:good.example.net:3478\nturn:bad' },
  ]), [{ urls: ['stun:stun.example.org:3478'] }]);
});

test('handles empty and invalid responses without throwing', () => {
  assert.deepEqual(validateIceServers(null), []);
  assert.deepEqual(validateIceServers([{ urls: null }, {}]), []);
});
