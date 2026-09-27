export const CALL_STATUS = {
  IDLE: 'idle',
  REQUESTING_MEDIA: 'requesting-media',
  CREATING: 'creating',
  OUTGOING_RINGING: 'outgoing-ringing',
  INCOMING_RINGING: 'incoming-ringing',
  ANSWERING: 'answering',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ENDED: 'ended',
  FAILED: 'failed',
};

export const initialCallState = {
  status: CALL_STATUS.IDLE,
  callId: null,
  type: 'video',
  callerId: null,
  calleeId: null,
  error: '',
  warning: '',
  startedAt: null,
  connectedAt: null,
  endedAt: null,
  muted: false,
  cameraEnabled: true,
  facingMode: 'user',
  relayAvailable: false,
  connectionRoute: 'unknown',
  reconnectAttempts: 0,
  diagnostics: {
    quality: 'unknown',
    rttMs: null,
    jitterMs: null,
    packetLossPct: null,
    inboundKbps: null,
    outboundKbps: null,
    fps: null,
    frameWidth: null,
    frameHeight: null,
    availableOutgoingKbps: null,
    sampledAt: null,
  },
};

export function callCanTransition(from, to, actor = 'either') {
  if (from === to) return true;

  const allowed = {
    creating: {
      ringing: ['caller'],
      ended: ['caller'],
      failed: ['caller'],
    },
    ringing: {
      connecting: ['callee'],
      declined: ['callee'],
      missed: ['caller'],
      ended: ['caller'],
    },
    connecting: {
      connected: ['either'],
      reconnecting: ['either'],
      ended: ['either'],
      failed: ['either'],
    },
    connected: {
      reconnecting: ['either'],
      ended: ['either'],
      failed: ['either'],
    },
    reconnecting: {
      connecting: ['either'],
      connected: ['either'],
      ended: ['either'],
      failed: ['either'],
    },
  };

  const actors = allowed[from]?.[to] || [];
  return actors.includes('either') || actors.includes(actor);
}
