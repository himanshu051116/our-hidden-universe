import test from 'node:test';
import assert from 'node:assert/strict';
import { setCallVideoDataSaver } from '../src/services/callBandwidthService.js';

test('video data saver limits bitrate and restores original sender parameters', async () => {
  const history = [];
  const sender = {
    track: { kind: 'video', readyState: 'live' },
    parameters: { transactionId: 'abc', encodings: [{ maxBitrate: 1_200_000, maxFramerate: 30 }] },
    getParameters() { return structuredClone(this.parameters); },
    async setParameters(value) { this.parameters = structuredClone(value); history.push(value); },
  };
  const peer = { getSenders: () => [sender] };
  assert.equal(await setCallVideoDataSaver(peer, true), true);
  assert.equal(sender.parameters.encodings[0].maxBitrate, 450_000);
  assert.equal(sender.parameters.encodings[0].maxFramerate, 15);
  assert.equal(sender.parameters.encodings[0].scaleResolutionDownBy, 1.5);
  assert.equal(await setCallVideoDataSaver(peer, false), true);
  assert.equal(sender.parameters.encodings[0].maxBitrate, 1_200_000);
  assert.equal(sender.parameters.encodings[0].maxFramerate, 30);
  assert.equal(sender.parameters.encodings[0].scaleResolutionDownBy, undefined);
  assert.equal(history.length, 2);
});

test('video data saver refuses unsupported video sender without misleading the UI', async () => {
  await assert.rejects(setCallVideoDataSaver({ getSenders: () => [] }, true), /not supported/);
  const sender = {
    track: { kind: 'video', readyState: 'live' },
    getParameters: () => ({ encodings: [] }),
    async setParameters() { throw new Error('should not call'); },
  };
  await assert.rejects(setCallVideoDataSaver({ getSenders: () => [sender] }, true), /cannot change video quality/);
});

test('sender failure preserves negotiated parameters and supports retry', async () => {
  let fail = true;
  const sender = {
    track: { kind: 'video', readyState: 'live' },
    params: { encodings: [{ scaleResolutionDownBy: 2 }] },
    getParameters() { return structuredClone(this.params); },
    async setParameters(value) {
      if (fail) throw new Error('unsupported setting');
      this.params = structuredClone(value);
    },
  };
  const peer = { getSenders: () => [sender] };
  await assert.rejects(setCallVideoDataSaver(peer, true), /unsupported setting/);
  assert.equal(sender.params.encodings[0].scaleResolutionDownBy, 2);
  fail = false;
  await setCallVideoDataSaver(peer, true);
  assert.equal(sender.params.encodings[0].scaleResolutionDownBy, 2, 'existing stronger downscale is preserved');
  await setCallVideoDataSaver(peer, false);
  assert.equal(sender.params.encodings[0].scaleResolutionDownBy, 2);
});
