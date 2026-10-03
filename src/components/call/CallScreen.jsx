import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  PhoneOff,
  RefreshCw,
  Route,
  ShieldCheck,
  Signal,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CALL_STATUS } from '../../calls/callState.js';
import { useCall } from '../../calls/CallContext.jsx';

function attachStream(element, stream) {
  if (!element) return;
  if (element.srcObject !== stream) element.srcObject = stream || null;
}

function formatDuration(seconds) {
  const value = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(value / 60);
  const remainder = value % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export default function CallScreen() {
  const {
    call,
    localStream,
    remoteStream,
    endCall,
    toggleMute,
    toggleCamera,
    flipCamera,
  } = useCall();

  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => attachStream(localRef.current, localStream), [localStream]);
  useEffect(() => attachStream(remoteRef.current, remoteStream), [remoteStream]);

  useEffect(() => {
    if (call.status !== CALL_STATUS.CONNECTED || !call.connectedAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [call.status, call.connectedAt]);

  const visible = ![
    CALL_STATUS.IDLE,
    CALL_STATUS.INCOMING_RINGING,
    CALL_STATUS.ENDED,
  ].includes(call.status);

  const duration = useMemo(
    () => (call.connectedAt ? Math.max(0, Math.floor((now - call.connectedAt) / 1000)) : 0),
    [call.connectedAt, now],
  );

  if (!visible) return null;

  const isAudioOnly = call.type === 'audio';

  const statusLabel = {
    [CALL_STATUS.REQUESTING_MEDIA]: 'Preparing camera and microphone…',
    [CALL_STATUS.CREATING]: 'Creating private call…',
    [CALL_STATUS.OUTGOING_RINGING]: 'Calling your partner…',
    [CALL_STATUS.ANSWERING]: 'Answering…',
    [CALL_STATUS.CONNECTING]: 'Connecting…',
    [CALL_STATUS.CONNECTED]: `Connected · ${formatDuration(duration)}`,
    [CALL_STATUS.RECONNECTING]: `Reconnecting… attempt ${Math.max(1, call.reconnectAttempts)}`,
    [CALL_STATUS.FAILED]: call.error || 'Call failed',
  }[call.status] || 'Connecting…';

  const qualityLabel =
    call.diagnostics?.quality && call.diagnostics.quality !== 'unknown'
      ? `${call.diagnostics.quality[0].toUpperCase()}${call.diagnostics.quality.slice(1)} quality`
      : 'Measuring quality';

  const routeLabel =
    call.connectionRoute === 'relay'
      ? 'TURN relay'
      : call.connectionRoute === 'direct'
        ? 'Direct peer-to-peer'
        : call.relayAvailable
          ? 'TURN ready'
          : 'STUN fallback';

  const showConnectionWarning = Boolean(call.warning) && call.status !== CALL_STATUS.CONNECTED;

  return (
    <div className="fixed inset-0 z-[75] overflow-hidden bg-[#020308]">
      <div className="absolute inset-0">
        {!isAudioOnly && remoteStream ? (
          <video
            ref={remoteRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_center,rgba(255,182,200,.13),transparent_32rem),linear-gradient(135deg,#030510,#130817)]">
            <div className="text-center">
              <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border border-blush/30 bg-blush/10 font-display text-4xl text-blush">
                U
              </div>
              <p className="mt-5 text-sm text-pink-100/70">
                {isAudioOnly ? 'Private audio call' : 'Waiting for partner video'}
              </p>
            </div>
          </div>
        )}
      </div>

      {!isAudioOnly && localStream ? (
        <video
          ref={localRef}
          autoPlay
          muted
          playsInline
          className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] z-10 h-40 w-28 rounded-2xl border border-white/15 bg-black object-cover shadow-2xl sm:h-52 sm:w-36"
        />
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/85 to-transparent px-5 pb-14 pt-[calc(1rem+env(safe-area-inset-top))]">
        <p className="text-xs uppercase tracking-[0.18em] text-roseGold">Our Hidden Universe</p>
        <p className="mt-1 text-sm text-white">{statusLabel}</p>

        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-pink-100/70">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1">
            <Route size={12} />
            {routeLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1">
            <ShieldCheck size={12} />
            WebRTC encrypted media
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1">
            <Signal size={12} />
            {qualityLabel}
          </span>
        </div>

        {showConnectionWarning ? (
          <p className="mt-2 max-w-md text-[11px] text-amber-100/85">{call.warning}</p>
        ) : null}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/92 to-transparent px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-16">
        <div className="mx-auto flex max-w-md items-center justify-center gap-3">
          <button
            type="button"
            onClick={toggleMute}
            className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/10 text-white"
            aria-label={call.muted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {call.muted ? <MicOff size={19} /> : <Mic size={19} />}
          </button>

          {!isAudioOnly ? (
            <>
              <button
                type="button"
                onClick={toggleCamera}
                className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/10 text-white"
                aria-label={call.cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
              >
                {call.cameraEnabled ? <Camera size={19} /> : <CameraOff size={19} />}
              </button>

              <button
                type="button"
                onClick={flipCamera}
                className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/10 text-white"
                aria-label="Switch camera"
              >
                <RefreshCw size={18} />
              </button>
            </>
          ) : null}

          <button
            type="button"
            onClick={() => endCall('user-ended')}
            className="grid h-14 w-14 place-items-center rounded-full bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,.35)]"
            aria-label="End call"
          >
            <PhoneOff size={21} />
          </button>
        </div>
      </div>
    </div>
  );
}
