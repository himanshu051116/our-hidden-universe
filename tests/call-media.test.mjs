import test from 'node:test';
import assert from 'node:assert/strict';
import { switchCamera } from '../src/services/mediaService.js';

class FakeStream {
  constructor(tracks = []) { this.tracks = tracks; }
  getTracks() { return this.tracks; }
  getAudioTracks() { return this.tracks.filter((track) => track.kind === 'audio'); }
  getVideoTracks() { return this.tracks.filter((track) => track.kind === 'video'); }
}

function track(kind, enabled = true) {
  return {
    kind, enabled, readyState: 'live',
    stop() { this.readyState = 'ended'; },
  };
}

test('switch camera preserves disabled video and existing microphone', async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalMediaStream = globalThis.MediaStream;
  const audio = track('audio');
  const oldVideo = track('video', false);
  const replacementVideo = track('video');
  const initial = new FakeStream([audio, oldVideo]);
  const replacement = new FakeStream([replacementVideo]);
  let senderTrack = oldVideo;
  const peer = { getSenders: () => [{
    track: oldVideo,
    async replaceTrack(next) { senderTrack = next; },
  }] };

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { mediaDevices: { getUserMedia: async () => replacement } },
  });
  globalThis.MediaStream = FakeStream;
  try {
    const result = await switchCamera(initial, peer, 'user');
    assert.equal(result.facingMode, 'environment');
    assert.notEqual(result.stream, initial);
    assert.equal(result.stream.getAudioTracks()[0], audio);
    assert.equal(result.stream.getVideoTracks()[0], replacementVideo);
    assert.equal(replacementVideo.enabled, false, 'camera must remain off');
    assert.equal(oldVideo.readyState, 'ended');
    assert.equal(audio.readyState, 'live');
    assert.equal(senderTrack, replacementVideo);
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete globalThis.navigator;
    globalThis.MediaStream = originalMediaStream;
  }
});

test('failed sender replacement stops new camera without losing old camera', async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalMediaStream = globalThis.MediaStream;
  const audio = track('audio');
  const oldVideo = track('video');
  const replacementVideo = track('video');
  const initial = new FakeStream([audio, oldVideo]);
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { mediaDevices: { getUserMedia: async () => new FakeStream([replacementVideo]) } },
  });
  globalThis.MediaStream = FakeStream;
  try {
    await assert.rejects(switchCamera(initial, { getSenders: () => [{
      track: oldVideo, async replaceTrack() { throw new Error('replace failed'); },
    }] }, 'user'), /replace failed/);
    assert.equal(replacementVideo.readyState, 'ended');
    assert.equal(oldVideo.readyState, 'live');
    assert.equal(audio.readyState, 'live');
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete globalThis.navigator;
    globalThis.MediaStream = originalMediaStream;
  }
});
