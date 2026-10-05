import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  PhoneOff,
  RefreshCw,
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
    partner,
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
  const partnerName = partner?.displayName || partner?.email || 'Your partner';
  const initial = String(partnerName).trim().charAt(0).toUpperCase() || 'P';

  const statusLabel = {
    [CALL_STATUS.REQUESTING_MEDIA]: 'Preparing your device…',
    [CALL_STATUS.CREATING]: 'Starting private call…',
    [CALL_STATUS.OUTGOING_RINGING]: `Calling ${partnerName}…`,
    [CALL_STATUS.ANSWERING]: 'Answering…',
    [CALL_STATUS.CONNECTING]: 'Connecting…',
    [CALL_STATUS.CONNECTED]: formatDuration(duration),
    [CALL_STATUS.RECONNECTING]: 'Reconnecting…',
    [CALL_STATUS.FAILED]: call.error || 'Call failed',
  }[call.status] || 'Connecting…';

  const quality = call.diagnostics?.quality && call.diagnostics.quality !== 'unknown'
    ? call.diagnostics.quality
    : null;

  const showConnectionWarning = Boolean(call.warning) && call.status !== CALL_STATUS.CONNECTED;

  return (
    <div className="fixed inset-0 z-[75] overflow-hidden bg-[#020308]">
      <div className="absolute inset-0">
        {!isAudioOnly && remoteStream ? (
          <video ref={remoteRef} autoPlay playsInline className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_center,rgba(255,182,200,.14),transparent_28rem),linear-gradient(145deg,#02030a,#120714)] px-6">
            <div className="text-center">
              <div className="relative mx-auto grid h-28 w-28 place-items-center rounded-full border border-blush/25 bg-blush/10 font-display text-5xl text-blush shadow-[0_0_70px_rgba(244,174,190,.12)]">
                <span className="absolute inset-[-10px] rounded-full border border-blush/10" />
                {initial}
              </div>
              <h2 className="mt-5 font-display text-3xl text-white">{partnerName}</h2>
              <p className="mt-2 text-sm text-pink-100/60">{isAudioOnly ? 'Private audio call' : 'Waiting for partner video'}</p>
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
          className="absolute right-3 top-[calc(4.6rem+env(safe-area-inset-top))] z-20 h-36 w-24 rounded-2xl border border-white/15 bg-black object-cover shadow-2xl sm:right-5 sm:top-[calc(5rem+env(safe-area-inset-top))] sm:h-48 sm:w-32"
        />
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/82 via-black/32 to-transparent px-4 pb-16 pt-[calc(0.9rem+env(safe-area-inset-top))] sm:px-5">
        <div className="flex items-start justify-between gap-3 pr-28 sm:pr-36">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-white">{partnerName}</p>
            <p className="mt-0.5 text-xs text-pink-100/65">{statusLabel}</p>
          </div>
          {call.status === CALL_STATUS.CONNECTED ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 text-[10px] text-pink-100/70 backdrop-blur-md">
              <Signal size={11} />
              {quality ? `${quality} connection` : 'Connected'}
            </span>
          ) : null}
        </div>
        {showConnectionWarning ? <p className="mt-2 max-w-sm text-[10px] leading-4 text-amber-100/80">{call.warning}</p> : null}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/88 to-transparent px-3 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-20 sm:px-4 sm:pt-24">
        <div className="mx-auto max-w-sm rounded-[1.7rem] border border-white/10 bg-black/48 p-2.5 shadow-[0_18px_70px_rgba(0,0,0,.45)] backdrop-blur-2xl">
          <div className="flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={toggleMute}
              className={`grid h-12 w-12 place-items-center rounded-full border transition active:scale-95 ${call.muted ? 'border-white/10 bg-white text-midnight' : 'border-white/15 bg-white/10 text-white'}`}
              aria-label={call.muted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {call.muted ? <MicOff size={19} /> : <Mic size={19} />}
            </button>

            {!isAudioOnly ? (
              <>
                <button
                  type="button"
                  onClick={toggleCamera}
                  className={`grid h-12 w-12 place-items-center rounded-full border transition active:scale-95 ${!call.cameraEnabled ? 'border-white/10 bg-white text-midnight' : 'border-white/15 bg-white/10 text-white'}`}
                  aria-label={call.cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                >
                  {call.cameraEnabled ? <Camera size={19} /> : <CameraOff size={19} />}
                </button>

                <button
                  type="button"
                  onClick={flipCamera}
                  className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/10 text-white transition active:scale-95"
                  aria-label="Switch camera"
                >
                  <RefreshCw size={18} />
                </button>
              </>
            ) : null}

            <button
              type="button"
              onClick={() => endCall('user-ended')}
              className="grid h-14 w-14 place-items-center rounded-full bg-red-500 text-white shadow-[0_0_34px_rgba(239,68,68,.28)] transition active:scale-95"
              aria-label="End call"
            >
              <PhoneOff size={21} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
