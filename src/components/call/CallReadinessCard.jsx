import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { acquireLocalMedia, stopMediaStream } from '../../services/mediaService.js';
import { resolveIceServers } from '../../services/turnService.js';

async function probeRelay(iceServers) {
  if (typeof RTCPeerConnection === 'undefined') return false;
  const peer = new RTCPeerConnection({ iceServers, iceTransportPolicy: 'relay' });
  let found = false;
  try {
    peer.onicecandidate = (event) => {
      if (event.candidate?.candidate?.includes(' typ relay ')) found = true;
    };
    peer.createDataChannel('relay-preflight');
    await peer.setLocalDescription(await peer.createOffer());
    await Promise.race([
      new Promise((resolve) => {
        if (peer.iceGatheringState === 'complete') return resolve();
        peer.addEventListener('icegatheringstatechange', () => {
          if (peer.iceGatheringState === 'complete') resolve();
        });
      }),
      new Promise((resolve) => window.setTimeout(resolve, 7000)),
    ]);
    return found;
  } finally {
    peer.close();
  }
}

export default function CallReadinessCard() {
  const { coupleId } = useAuth();
  const [busy, setBusy] = useState('');
  const [mediaResult, setMediaResult] = useState('');
  const [relayResult, setRelayResult] = useState('');

  async function testMedia() {
    if (busy) return;
    setBusy('media');
    setMediaResult('');
    let stream;
    try {
      stream = await acquireLocalMedia('video');
      const audio = stream.getAudioTracks().length > 0;
      const video = stream.getVideoTracks().length > 0;
      setMediaResult(audio && video ? 'Microphone and camera available.'
        : 'One or more media tracks are unavailable.');
    } catch (error) {
      setMediaResult(error?.message || 'Device permissions could not be verified.');
    } finally {
      stopMediaStream(stream);
      setBusy('');
    }
  }

  async function testRelay() {
    if (busy) return;
    setBusy('relay');
    setRelayResult('');
    try {
      const config = await resolveIceServers(coupleId);
      if (!config.relayAvailable) {
        setRelayResult('TURN is not configured or credentials could not be obtained. STUN-only calling is less reliable on restrictive networks.');
      } else {
        const allocated = await probeRelay(config.iceServers);
        setRelayResult(allocated
          ? 'A TURN relay candidate was allocated. This does not guarantee the partner connection will succeed.'
          : 'TURN credentials were returned, but this browser could not allocate a relay candidate. Check TURN ports, TLS and network access.');
      }
    } catch (error) {
      setRelayResult(error?.message || 'Unable to test TURN relay allocation.');
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="glass rounded-2xl p-4 sm:rounded-3xl sm:p-5">
      <h3 className="font-display text-2xl text-white">Call readiness</h3>
      <p className="mt-1 text-xs leading-5 text-pink-100/60">
        Run these checks on each phone. Device testing opens camera/microphone locally but never places a call or uploads video.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={Boolean(busy)} onClick={testMedia}
          className="min-h-11 rounded-xl border border-white/15 bg-white/[0.06] px-4 text-xs font-semibold text-white disabled:opacity-50">
          {busy === 'media' ? 'Checking devices…' : 'Test camera & mic'}
        </button>
        <button type="button" disabled={Boolean(busy)} onClick={testRelay}
          className="min-h-11 rounded-xl border border-blush/25 bg-blush/10 px-4 text-xs font-semibold text-blush disabled:opacity-50">
          {busy === 'relay' ? 'Testing relay…' : 'Test TURN connectivity'}
        </button>
      </div>
      {mediaResult ? <p role="status" className="mt-3 text-xs leading-5 text-pink-100/80">{mediaResult}</p> : null}
      {relayResult ? <p role="status" className="mt-3 text-xs leading-5 text-pink-100/80">{relayResult}</p> : null}
    </section>
  );
}
