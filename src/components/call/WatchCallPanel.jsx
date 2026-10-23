import {
  Camera, CameraOff, Headphones, Maximize2, Mic, MicOff, Phone,
  PhoneOff, RefreshCw, Signal, Video, Gauge,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useCall } from '../../calls/CallContext.jsx';
import { CALL_STATUS } from '../../calls/callState.js';

const activeStatuses = new Set([
  CALL_STATUS.REQUESTING_MEDIA,
  CALL_STATUS.CREATING,
  CALL_STATUS.OUTGOING_RINGING,
  CALL_STATUS.ANSWERING,
  CALL_STATUS.CONNECTING,
  CALL_STATUS.CONNECTED,
  CALL_STATUS.RECONNECTING,
]);

function bindStream(video, stream) {
  if (video && video.srcObject !== (stream || null)) video.srcObject = stream || null;
}

function StatusIndicator({ call }) {
  const text = {
    [CALL_STATUS.REQUESTING_MEDIA]: 'Requesting camera and microphone…',
    [CALL_STATUS.CREATING]: 'Preparing encrypted media connection…',
    [CALL_STATUS.OUTGOING_RINGING]: 'Calling your partner…',
    [CALL_STATUS.ANSWERING]: 'Answering your partner…',
    [CALL_STATUS.CONNECTING]: 'Establishing connection…',
    [CALL_STATUS.CONNECTED]: 'Connected · Watch and talk',
    [CALL_STATUS.RECONNECTING]: 'Reconnecting call…',
    [CALL_STATUS.FAILED]: 'Connection failed',
  }[call.status] || 'Ready for a private call';

  return (
    <div className="flex min-w-0 items-center gap-2" aria-live="polite">
      <span className={'h-2 w-2 shrink-0 rounded-full ' + (
        call.status === CALL_STATUS.CONNECTED ? 'bg-emerald-300' :
          call.status === CALL_STATUS.FAILED ? 'bg-red-300' :
            activeStatuses.has(call.status) ? 'animate-pulse bg-amber-300' : 'bg-white/35'
      )} />
      <p className="truncate text-xs font-medium text-pink-100/80">{text}</p>
    </div>
  );
}

const buttonBase = 'grid h-11 w-11 shrink-0 place-items-center rounded-full border transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush disabled:cursor-not-allowed disabled:opacity-35';

export default function WatchCallPanel() {
  const navigate = useNavigate();
  const {
    call, partner, roomMemberCount, localStream, remoteStream, startCall,
    endCall, toggleMute, toggleCamera, flipCamera, toggleDataSaver,
  } = useCall();

  const remoteRef = useRef(null);
  const localRef = useRef(null);
  const [error, setError] = useState('');
  const [qualityBusy, setQualityBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [dockSide, setDockSide] = useState('right');
  const [mobileDock, setMobileDock] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 1023px)');
    const update = () => setMobileDock(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const connected = call.status === CALL_STATUS.CONNECTED;
  useEffect(() => {
    if (!connected) return undefined;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [connected]);
  const durationSeconds = call.connectedAt ? Math.max(0, Math.floor((now - call.connectedAt) / 1000)) : 0;
  const durationLabel = `${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, '0')}`;
  const active = activeStatuses.has(call.status);
  const canStart = call.status === CALL_STATUS.IDLE || call.status === CALL_STATUS.ENDED;
  const audioOnly = call.type === 'audio';
  const hasMicrophone = Boolean(localStream?.getAudioTracks?.().some((track) => track.readyState === 'live'));
  const hasCamera = Boolean(localStream?.getVideoTracks?.().some((track) => track.readyState === 'live'));

  useEffect(() => {
    const element = remoteRef.current;
    if (!element) return;
    bindStream(element, remoteStream);
    if (remoteStream) {
      element.play?.()
        .then(() => setPlaybackBlocked(false))
        .catch(() => setPlaybackBlocked(true));
    }
  }, [remoteStream, call.status, audioOnly, expanded, mobileDock]);

  useEffect(() => {
    bindStream(localRef.current, localStream);
  }, [localStream, call.status, audioOnly, expanded, mobileDock]);

  useEffect(() => {
    if (!active && call.status !== CALL_STATUS.FAILED) setPlaybackBlocked(false);
  }, [active, call.status]);

  async function beginCall(type) {
    setError('');
    try {
      await startCall(type);
    } catch (callError) {
      setError(callError?.message || 'Could not start the call. Check device permissions and try again.');
    }
  }

  async function changeDataSaver() {
    if (qualityBusy) return;
    setQualityBusy(true);
    setError('');
    try {
      await toggleDataSaver();
    } catch (problem) {
      setError(problem?.message || 'This device cannot change outgoing video quality.');
    } finally {
      setQualityBusy(false);
    }
  }

  async function switchLocalCamera() {
    setError('');
    try {
      await flipCamera();
    } catch (problem) {
      setError(problem?.message || 'Could not switch camera. You can keep using your current camera.');
    }
  }

  async function unlockAudio() {
    try {
      await remoteRef.current?.play?.();
      setPlaybackBlocked(false);
    } catch {
      setPlaybackBlocked(true);
    }
  }

  const partnerName = partner?.displayName || partner?.email || 'Your partner';
  const quality = call.diagnostics?.quality && call.diagnostics.quality !== 'unknown'
    ? call.diagnostics.quality : null;

  const panel = (
    <aside
      aria-label="Watch Together video call"
      data-watch-call-status={call.status}
      className={
        'min-w-0 self-start overflow-hidden rounded-[26px] border border-white/15 bg-[#151020]/95 shadow-[0_24px_70px_rgba(0,0,0,.3)] lg:sticky lg:top-24 lg:w-auto lg:max-h-none ' +
        (active
          ? 'fixed bottom-[calc(5.7rem+env(safe-area-inset-bottom))] z-40 max-h-[min(65vh,490px)] w-[min(72vw,270px)] overflow-y-auto overscroll-contain lg:overflow-visible ' +
            (dockSide === 'right' ? 'right-3 lg:right-auto' : 'left-3 lg:left-auto')
          : 'w-full')
      }
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 p-3.5 sm:px-4">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-blush">
            <Video size={13} aria-hidden="true" /> Private video call
          </p>
          <div className="mt-1"><StatusIndicator call={call} /></div>
          {connected ? <p className="mt-1 font-mono text-[11px] text-pink-100/60" aria-label="Call duration">{durationLabel}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {active ? (
            <button
              type="button"
              onClick={() => setDockSide((current) => current === 'right' ? 'left' : 'right')}
              className="rounded-full border border-white/15 px-2.5 py-2 text-[11px] font-semibold text-pink-100/75 transition hover:border-blush/50 hover:text-white lg:hidden"
              aria-label="Move floating call to other side"
            >
              Move
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls="watch-call-content"
            className="rounded-full border border-white/15 px-2.5 py-2 text-[11px] font-semibold text-pink-100/75 transition hover:border-blush/50 hover:text-white"
          >
            {expanded ? 'Compact' : 'Expand'}
          </button>
        </div>
      </div>

      <div id="watch-call-content" className={expanded ? 'p-3.5 sm:p-4' : active ? 'p-2' : 'hidden'}>
        {active ? (
          <>
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_center,#322240,#090912_75%)]">
              {!audioOnly && remoteStream ? (
                <video
                  ref={remoteRef}
                  autoPlay
                  playsInline
                  className="h-full w-full object-cover"
                  aria-label="Partner video"
                />
              ) : (
                <div className="grid h-full place-items-center px-4 text-center">
                  <div>
                    <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-blush/20 bg-blush/10 font-display text-3xl text-blush" aria-hidden="true">
                      {partnerName.trim().charAt(0).toUpperCase() || 'P'}
                    </span>
                    <p className="mt-3 text-sm font-semibold text-white">{partnerName}</p>
                    <p className="mt-1 text-[11px] leading-4 text-pink-100/55">
                      {audioOnly ? 'Audio-only call' : connected ? 'Partner video is unavailable' : 'Waiting for the call to connect'}
                    </p>
                  </div>
                </div>
              )}

              {audioOnly && remoteStream ? (
                <audio ref={remoteRef} autoPlay playsInline aria-label="Partner audio" />
              ) : null}

              {!audioOnly && localStream ? (
                <video
                  ref={localRef}
                  autoPlay
                  muted
                  playsInline
                  aria-label="Your camera preview"
                  className="absolute bottom-2 right-2 h-[42%] max-h-28 w-[28%] min-w-16 rounded-xl border border-white/25 bg-black object-cover shadow-xl"
                />
              ) : null}
              {connected && quality ? (
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
                  <Signal size={11} aria-hidden="true" /> {quality}
                </span>
              ) : null}
            </div>

            {playbackBlocked ? (
              <button
                type="button"
                onClick={unlockAudio}
                className="mt-3 min-h-10 w-full rounded-2xl border border-amber-200/30 bg-amber-200/10 px-3 py-2 text-xs font-semibold text-amber-100"
              >
                Tap to hear your partner
              </button>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                disabled={!hasMicrophone}
                className={buttonBase + (call.muted ? ' border-white/25 bg-white text-midnight' : ' border-white/15 bg-white/10 text-white')}
                aria-label={call.muted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {call.muted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              {!audioOnly ? (
                <>
                  <button
                    type="button"
                    onClick={toggleCamera}
                    disabled={!hasCamera}
                    className={buttonBase + (!call.cameraEnabled ? ' border-white/25 bg-white text-midnight' : ' border-white/15 bg-white/10 text-white')}
                    aria-label={call.cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                  >
                    {call.cameraEnabled ? <Camera size={18} /> : <CameraOff size={18} />}
                  </button>
                  <button
                    type="button"
                    onClick={switchLocalCamera}
                    disabled={!hasCamera}
                    className={buttonBase + ' border-white/15 bg-white/10 text-white'}
                    aria-label="Switch camera"
                  >
                    <RefreshCw size={17} />
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => endCall('user-ended')}
                className={buttonBase + ' border-red-400/30 bg-red-500 text-white hover:bg-red-600'}
                aria-label="End call"
              >
                <PhoneOff size={20} />
              </button>
            </div>
            {connected && !audioOnly ? (
              <button
                type="button"
                onClick={changeDataSaver}
                disabled={qualityBusy}
                aria-pressed={Boolean(call.dataSaverEnabled)}
                className={'mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border px-3 text-xs font-semibold transition disabled:opacity-45 ' +
                  (call.dataSaverEnabled ? 'border-emerald-300/35 bg-emerald-300/10 text-emerald-100' : 'border-white/15 bg-white/[0.04] text-pink-100/75 hover:border-blush/40 hover:text-white')}
              >
                <Gauge size={14} aria-hidden="true" />
                {qualityBusy ? 'Adjusting video…' : call.dataSaverEnabled ? 'Data saver on · turn off' : 'Save video data'}
              </button>
            ) : null}
            {expanded && connected ? (
              <button
                type="button"
                onClick={() => navigate('/universe/chat')}
                className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-pink-100/75 transition hover:border-blush/40 hover:text-white"
              >
                <Maximize2 size={14} aria-hidden="true" />
                Full-screen call
              </button>
            ) : null}
            {call.warning ? <p className="mt-2 text-xs leading-5 text-amber-100/80">{call.warning}</p> : null}
          </>
        ) : (
          <div className="space-y-3">
            <div className="grid min-h-24 place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-5 text-center">
              <p className="max-w-xs text-sm leading-6 text-pink-100/75">
                {call.status === CALL_STATUS.FAILED
                  ? call.error || 'The previous call could not connect.'
                  : partner
                    ? 'Keep your movie on screen while you see and talk to your partner.'
                    : 'Your partner needs to join this universe before a call can start.'}
              </p>
            </div>
            {call.status === CALL_STATUS.FAILED ? (
              <button
                type="button"
                onClick={() => endCall('dismiss-failed')}
                className="min-h-10 w-full rounded-full border border-white/15 px-4 text-xs text-pink-100/85"
              >
                Close call error
              </button>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => beginCall('video')}
                disabled={!partner || !canStart}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-blush px-3 text-xs font-semibold text-midnight transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                <Video size={15} /> Video call
              </button>
              <button
                type="button"
                onClick={() => beginCall('audio')}
                disabled={!partner || !canStart}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 px-3 text-xs font-semibold text-pink-100 transition hover:border-blush/50 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <Phone size={14} /> Audio call
              </button>
            </div>
            {!partner && roomMemberCount > 2 ? (
              <p className="text-xs text-amber-100/75">Private calling supports exactly two room members.</p>
            ) : null}
          </div>
        )}
        {error ? <p role="alert" className="mt-3 rounded-xl border border-red-300/20 bg-red-500/10 p-3 text-xs text-red-100">{error}</p> : null}
        {expanded ? <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-5 text-pink-100/55">
          <Headphones size={14} className="mt-0.5 shrink-0 text-blush" aria-hidden="true" />
          Wear headphones to avoid your movie audio being picked up by the microphone. Each person plays their own video.
        </p> : null}
      </div>
      {!expanded && active ? (
        <p className="px-2 pb-2 text-center text-[10px] text-pink-100/60">
          {connected ? 'Live call · compact view' : 'Call is connecting'}
        </p>
      ) : null}
    </aside>
  );
  return active && mobileDock && typeof document !== 'undefined'
    ? createPortal(panel, document.body)
    : panel;
}
