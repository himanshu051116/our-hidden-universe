import { FALLBACK_ICE_SERVERS } from './turnService.js';

export function createPeerConnection({
  onIceCandidate,
  onTrack,
  onConnectionStateChange,
  onIceConnectionStateChange,
  iceServers = FALLBACK_ICE_SERVERS,
}) {
  const peer = new RTCPeerConnection({
    iceServers,
    bundlePolicy: 'max-bundle',
  });

  peer.onicecandidate = (event) => {
    if (event.candidate) onIceCandidate?.(event.candidate.toJSON());
  };

  peer.ontrack = (event) => {
    onTrack?.(event.streams?.[0] || new MediaStream([event.track]));
  };

  peer.onconnectionstatechange = () => {
    onConnectionStateChange?.(peer.connectionState);
  };

  peer.oniceconnectionstatechange = () => {
    onIceConnectionStateChange?.(peer.iceConnectionState);
  };

  return peer;
}

export function attachLocalTracks(peer, stream) {
  if (!peer || !stream) return;
  stream.getTracks().forEach((track) => peer.addTrack(track, stream));
}

export async function createAndSetOffer(peer, options = {}) {
  const offer = await peer.createOffer({
    iceRestart: Boolean(options.iceRestart),
  });
  await peer.setLocalDescription(offer);
  return {
    type: peer.localDescription.type,
    sdp: peer.localDescription.sdp,
  };
}

export async function createAndSetAnswer(peer) {
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  return {
    type: peer.localDescription.type,
    sdp: peer.localDescription.sdp,
  };
}

export async function applyRemoteDescription(peer, description) {
  if (!peer || !description?.type || !description?.sdp) return;
  if (peer.remoteDescription?.sdp === description.sdp) return;
  await peer.setRemoteDescription(description);
}

export async function safelyAddIceCandidate(peer, candidate) {
  if (!peer || !candidate) return;
  await peer.addIceCandidate(candidate);
}

export async function inspectConnectionRoute(peer) {
  if (!peer?.getStats) return 'unknown';

  try {
    const stats = await peer.getStats();

    for (const report of stats.values()) {
      if (
        report.type !== 'candidate-pair'
        || report.state !== 'succeeded'
        || !report.nominated
      ) {
        continue;
      }

      const local = stats.get(report.localCandidateId);
      const remote = stats.get(report.remoteCandidateId);

      if (local?.candidateType === 'relay' || remote?.candidateType === 'relay') {
        return 'relay';
      }
      return 'direct';
    }
  } catch {
    // Route information is diagnostic only.
  }

  return 'unknown';
}

export function closePeerConnection(peer) {
  if (!peer) return;
  peer.onicecandidate = null;
  peer.ontrack = null;
  peer.onconnectionstatechange = null;
  peer.oniceconnectionstatechange = null;
  peer.close();
}
