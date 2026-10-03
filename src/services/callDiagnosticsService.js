function finite(value) {
  return Number.isFinite(value) ? value : null;
}

function kbps(bytesDelta, milliseconds) {
  if (!Number.isFinite(bytesDelta) || bytesDelta < 0 || milliseconds <= 0) return null;
  return (bytesDelta * 8) / milliseconds;
}

export function qualityFromMetrics({
  rttMs,
  jitterMs,
  packetLossPct,
}) {
  const hasMetrics = [rttMs, jitterMs, packetLossPct].some(Number.isFinite);
  if (!hasMetrics) return 'unknown';

  const rtt = Number.isFinite(rttMs) ? rttMs : 0;
  const jitter = Number.isFinite(jitterMs) ? jitterMs : 0;
  const loss = Number.isFinite(packetLossPct) ? packetLossPct : 0;

  // Product heuristic, not a WebRTC standard.
  if (rtt <= 120 && jitter <= 20 && loss <= 1) return 'excellent';
  if (rtt <= 250 && jitter <= 40 && loss <= 3) return 'good';
  if (rtt <= 450 && jitter <= 80 && loss <= 8) return 'fair';
  return 'poor';
}

function chosenPair(stats) {
  for (const report of stats.values()) {
    if (
      report.type === 'candidate-pair'
      && report.state === 'succeeded'
      && report.nominated
    ) {
      return report;
    }
  }
  return null;
}

function routeFromPair(stats, pair) {
  if (!pair) return 'unknown';
  const local = stats.get(pair.localCandidateId);
  const remote = stats.get(pair.remoteCandidateId);

  if (local?.candidateType === 'relay' || remote?.candidateType === 'relay') {
    return 'relay';
  }
  if (local || remote) return 'direct';
  return 'unknown';
}

export async function sampleCallDiagnostics(peer, previousSample = null) {
  if (!peer?.getStats) {
    return {
      sample: null,
      counters: previousSample?.counters || null,
    };
  }

  const stats = await peer.getStats();
  const now = Date.now();

  let inboundBytes = 0;
  let outboundBytes = 0;
  let packetsReceived = 0;
  let packetsLost = 0;
  let jitterSeconds = null;
  let fps = null;
  let frameWidth = null;
  let frameHeight = null;

  for (const report of stats.values()) {
    if (report.type === 'inbound-rtp' && !report.isRemote) {
      inboundBytes += Number(report.bytesReceived || 0);
      packetsReceived += Number(report.packetsReceived || 0);
      packetsLost += Math.max(0, Number(report.packetsLost || 0));

      if (report.kind === 'video' || report.mediaType === 'video') {
        fps = finite(Number(report.framesPerSecond)) ?? fps;
        frameWidth = finite(Number(report.frameWidth)) ?? frameWidth;
        frameHeight = finite(Number(report.frameHeight)) ?? frameHeight;
      }

      if (Number.isFinite(Number(report.jitter))) {
        const value = Number(report.jitter);
        jitterSeconds = jitterSeconds == null ? value : Math.max(jitterSeconds, value);
      }
    }

    if (report.type === 'outbound-rtp' && !report.isRemote) {
      outboundBytes += Number(report.bytesSent || 0);
    }
  }

  const pair = chosenPair(stats);
  const route = routeFromPair(stats, pair);
  const rttMs = pair && Number.isFinite(Number(pair.currentRoundTripTime))
    ? Number(pair.currentRoundTripTime) * 1000
    : null;
  const availableOutgoingKbps = pair && Number.isFinite(Number(pair.availableOutgoingBitrate))
    ? Number(pair.availableOutgoingBitrate) / 1000
    : null;

  const totalPackets = packetsReceived + packetsLost;
  const packetLossPct = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : null;
  const jitterMs = jitterSeconds == null ? null : jitterSeconds * 1000;

  const previous = previousSample?.counters;
  const elapsed = previous ? now - previous.timestamp : 0;

  const inboundKbps = previous
    ? kbps(inboundBytes - previous.inboundBytes, elapsed)
    : null;
  const outboundKbps = previous
    ? kbps(outboundBytes - previous.outboundBytes, elapsed)
    : null;

  const sample = {
    quality: qualityFromMetrics({
      rttMs,
      jitterMs,
      packetLossPct,
    }),
    route,
    rttMs: finite(rttMs),
    jitterMs: finite(jitterMs),
    packetLossPct: finite(packetLossPct),
    inboundKbps: finite(inboundKbps),
    outboundKbps: finite(outboundKbps),
    fps: finite(fps),
    frameWidth: finite(frameWidth),
    frameHeight: finite(frameHeight),
    availableOutgoingKbps: finite(availableOutgoingKbps),
    sampledAt: now,
  };

  return {
    sample,
    counters: {
      timestamp: now,
      inboundBytes,
      outboundBytes,
    },
  };
}
