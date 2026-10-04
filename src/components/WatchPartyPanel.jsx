import {
  CheckCircle2,
  Clapperboard,
  ExternalLink,
  FileVideo,
  Pause,
  Play,
  RotateCcw,
  Save,
  Settings2,
  Timer,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  emptyWatchParty,
  saveWatchPartySetup,
  sendWatchPartyCommand,
  subscribeWatchParty,
} from '../services/watchPartyService.js';

function formatTime(value) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function parseTime(value) {
  const input = String(value || '').trim();
  if (!input) return 0;
  if (!input.includes(':')) return Math.max(0, Number(input) || 0);
  const parts = input.split(':').map((part) => Number(part) || 0);
  if (parts.length === 2) return Math.max(0, parts[0] * 60 + parts[1]);
  if (parts.length >= 3) return Math.max(0, parts.at(-3) * 3600 + parts.at(-2) * 60 + parts.at(-1));
  return 0;
}

function sourceLabel(type) {
  if (type === 'direct') return 'Video link';
  if (type === 'local') return 'Video on this device';
  return 'Streaming service';
}

export default function WatchPartyPanel() {
  const { user, coupleId } = useAuth();
  const [room, setRoom] = useState(emptyWatchParty);
  const [draft, setDraft] = useState(emptyWatchParty);
  const [setupOpen, setSetupOpen] = useState(true);
  const [localVideoUrl, setLocalVideoUrl] = useState('');
  const [status, setStatus] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [manualTime, setManualTime] = useState('0:00');
  const videoRef = useRef(null);
  const lastCommandRef = useRef('');
  const suppressEventsUntilRef = useRef(0);
  const scheduledActionRef = useRef(0);
  const statusTimerRef = useRef(0);

  const playableUrl = room.sourceType === 'local' ? localVideoUrl : room.sourceUrl;
  const hasEmbeddedPlayer = room.sourceType !== 'external' && Boolean(playableUrl);
  const configured = Boolean(room.title || room.sourceUrl || room.sourceType === 'local');

  function showStatus(message) {
    setStatus(message);
    window.clearTimeout(statusTimerRef.current);
    statusTimerRef.current = window.setTimeout(() => setStatus(''), 2400);
  }

  useEffect(() => {
    const unsubscribe = subscribeWatchParty(
      coupleId,
      (nextRoom) => {
        setRoom(nextRoom);
        setDraft((current) => ({
          ...current,
          title: nextRoom.title,
          sourceType: nextRoom.sourceType,
          sourceUrl: nextRoom.sourceUrl,
        }));
        setManualTime(formatTime(nextRoom.playback?.currentTime || 0));
        if (!nextRoom.title && !nextRoom.sourceUrl) setSetupOpen(true);
      },
      () => showStatus('We could not sync the watch room. Try again.'),
    );
    return () => unsubscribe?.();
  }, [coupleId]);

  useEffect(() => {
    const command = room.playback;
    if (!command?.commandId || command.commandId === lastCommandRef.current) return undefined;
    lastCommandRef.current = command.commandId;

    const delay = Math.max(0, (command.executeAt || Date.now()) - Date.now());
    window.clearTimeout(scheduledActionRef.current);
    scheduledActionRef.current = window.setTimeout(() => {
      const video = videoRef.current;
      suppressEventsUntilRef.current = Date.now() + 1200;
      if (video) {
        if (Math.abs(video.currentTime - command.currentTime) > 0.8) {
          video.currentTime = command.currentTime;
        }
        if (command.action === 'play') {
          video.play().catch(() => showStatus('Tap the player once if your browser blocks automatic playback.'));
        } else {
          video.pause();
        }
      }
      showStatus(`${command.updatedByName || 'Partner'} ${command.action === 'play' ? 'started' : 'paused'} at ${formatTime(command.currentTime)}`);
    }, delay);

    return () => window.clearTimeout(scheduledActionRef.current);
  }, [room.playback]);

  useEffect(
    () => () => {
      window.clearTimeout(statusTimerRef.current);
      window.clearTimeout(scheduledActionRef.current);
      if (localVideoUrl) URL.revokeObjectURL(localVideoUrl);
    },
    [localVideoUrl],
  );

  async function saveSetup(event) {
    event.preventDefault();
    try {
      await saveWatchPartySetup(coupleId, user, draft);
      setSetupOpen(false);
      showStatus('Watch room saved for both of you.');
    } catch {
      showStatus('Unable to save this watch room.');
    }
  }

  function selectLocalVideo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (localVideoUrl) URL.revokeObjectURL(localVideoUrl);
    setLocalVideoUrl(URL.createObjectURL(file));
    showStatus('Video selected on this device. Your partner should choose the matching file on theirs.');
  }

  async function broadcast(action, currentTime = videoRef.current?.currentTime ?? parseTime(manualTime), delay = 0) {
    try {
      const executeAt = Date.now() + delay;
      await sendWatchPartyCommand(coupleId, user, { action, currentTime, executeAt });
      if (delay) {
        setCountdown(Math.ceil(delay / 1000));
        const countdownTimer = window.setInterval(() => {
          setCountdown((value) => {
            if (value <= 1) {
              window.clearInterval(countdownTimer);
              return 0;
            }
            return value - 1;
          });
        }, 1000);
      }
    } catch {
      showStatus('Unable to send the playback update.');
    }
  }

  function onNativePlayback(action) {
    if (Date.now() < suppressEventsUntilRef.current) return;
    broadcast(action);
  }

  function syncToRoom() {
    const command = room.playback;
    const video = videoRef.current;
    if (!video || !command) return;
    suppressEventsUntilRef.current = Date.now() + 1000;
    video.currentTime = command.currentTime || 0;
    if (command.action === 'play') {
      video.play().catch(() => showStatus('Tap the player once if your browser blocks automatic playback.'));
    } else {
      video.pause();
    }
    showStatus(`Matched the shared room at ${formatTime(command.currentTime)}`);
  }

  return (
    <article id="watch-party" className="scroll-mt-24 space-y-4">
      <section className="glass rounded-3xl p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-roseGold">
              <Clapperboard size={14} />
              Watch room
            </p>
            <h3 className="mt-2 truncate font-display text-3xl text-white sm:text-4xl">{room.title || 'Choose something to watch'}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-pink-100/55">
              <span className="rounded-full bg-white/[0.05] px-3 py-1.5">{sourceLabel(room.sourceType)}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-300/10 px-3 py-1.5 text-emerald-200">
                <CheckCircle2 size={12} />
                {room.playback?.action === 'play' ? 'Playing' : 'Paused'} · {formatTime(room.playback?.currentTime)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSetupOpen((value) => !value)}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-white/12 px-4 text-xs text-pink-100/65 transition hover:border-blush/45 hover:text-white"
          >
            <Settings2 size={14} />
            {setupOpen ? 'Close setup' : configured ? 'Room setup' : 'Set up room'}
          </button>
        </div>

        {setupOpen ? (
          <form onSubmit={saveSetup} className="mt-5 grid gap-3 border-t border-white/10 pt-5 md:grid-cols-2">
            <label className="text-xs text-pink-100/60">
              What are you watching?
              <input
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="Movie or episode title"
                className="mt-1.5 min-h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-3 text-sm text-white outline-none focus:border-blush/60"
              />
            </label>
            <label className="text-xs text-pink-100/60">
              Source
              <select
                value={draft.sourceType}
                onChange={(event) => setDraft((current) => ({ ...current, sourceType: event.target.value }))}
                className="mt-1.5 min-h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-3 text-sm text-white outline-none focus:border-blush/60"
              >
                <option value="external">Streaming service</option>
                <option value="direct">Video link</option>
                <option value="local">Video on this device</option>
              </select>
            </label>

            {draft.sourceType !== 'local' ? (
              <label className="text-xs text-pink-100/60 md:col-span-2">
                Link
                <input
                  value={draft.sourceUrl}
                  onChange={(event) => setDraft((current) => ({ ...current, sourceUrl: event.target.value }))}
                  placeholder={draft.sourceType === 'direct' ? 'Direct .mp4 or .webm link' : 'Link to the streaming page'}
                  className="mt-1.5 min-h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-3 text-sm text-white outline-none focus:border-blush/60"
                />
              </label>
            ) : (
              <label className="md:col-span-2 text-xs text-pink-100/60">
                Local video
                <span className="mt-1.5 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-black/30 px-4 text-sm text-pink-100/65 transition hover:border-blush/45">
                  <FileVideo size={16} />
                  {localVideoUrl ? 'Change selected video' : 'Choose the matching video on this device'}
                </span>
                <input type="file" accept="video/*" className="hidden" onChange={selectLocalVideo} />
              </label>
            )}

            <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-5 text-sm font-semibold text-midnight md:col-span-2">
              <Save size={15} />
              Save watch room
            </button>
          </form>
        ) : null}
      </section>

      {room.sourceType === 'local' && !localVideoUrl ? (
        <label className="glass inline-flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-dashed px-4 text-sm text-blush transition hover:border-blush/50">
          <FileVideo size={17} />
          Choose the matching video on this device
          <input type="file" accept="video/*" className="hidden" onChange={selectLocalVideo} />
        </label>
      ) : null}

      {hasEmbeddedPlayer ? (
        <video
          ref={videoRef}
          src={playableUrl}
          controls
          playsInline
          preload="metadata"
          onPlay={() => onNativePlayback('play')}
          onPause={() => onNativePlayback('pause')}
          onSeeked={() => onNativePlayback(videoRef.current?.paused ? 'pause' : 'play')}
          className="max-h-[65vh] w-full rounded-3xl bg-black object-contain shadow-[0_22px_70px_rgba(0,0,0,.35)]"
        />
      ) : room.sourceType === 'external' ? (
        <section className="glass rounded-3xl p-4 sm:p-5">
          <p className="text-sm leading-6 text-pink-100/68">Open the same title on both devices. OHS coordinates the shared timestamp and the countdown; the streaming service keeps playing in its own app or tab.</p>
          {room.sourceUrl ? (
            <a href={room.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-blush/45 px-4 text-sm text-blush transition hover:bg-blush/10">
              <ExternalLink size={15} />
              Open streaming service
            </a>
          ) : null}
        </section>
      ) : (
        <section className="rounded-3xl border border-dashed border-white/12 bg-black/20 px-5 py-10 text-center">
          <p className="font-display text-2xl text-white">Add a video link to start.</p>
          <button type="button" onClick={() => setSetupOpen(true)} className="mt-3 text-sm text-blush">Open room setup</button>
        </section>
      )}

      <section className="glass rounded-3xl p-4 sm:p-5">
        {countdown ? (
          <div className="mb-4 rounded-3xl border border-blush/25 bg-blush/[0.06] px-4 py-5 text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-roseGold">Starting together</p>
            <p className="mt-1 font-display text-6xl text-white">{countdown}</p>
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <button type="button" onClick={() => broadcast('play', undefined, 3000)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-4 text-sm font-semibold text-midnight transition hover:brightness-105">
            <Timer size={15} />
            Start together
          </button>
          <button type="button" onClick={() => broadcast('play')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 text-sm text-pink-100 transition hover:border-blush/40">
            <Play size={15} />
            Play
          </button>
          <button type="button" onClick={() => broadcast('pause')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 text-sm text-pink-100 transition hover:border-blush/40">
            <Pause size={15} />
            Pause
          </button>
          <button type="button" onClick={syncToRoom} disabled={!hasEmbeddedPlayer} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 text-sm text-pink-100 transition hover:border-blush/40 disabled:opacity-35">
            <RotateCcw size={15} />
            Match room
          </button>
        </div>

        <details className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <summary className="cursor-pointer text-xs text-pink-100/55">Having trouble staying in sync?</summary>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1 text-xs text-pink-100/55">
              Shared position
              <input
                type="text"
                inputMode="numeric"
                value={manualTime}
                onChange={(event) => setManualTime(event.target.value)}
                placeholder="41:18"
                className="mt-1.5 min-h-10 w-full rounded-xl border border-white/10 bg-black/35 px-3 text-sm text-white outline-none focus:border-blush/50"
              />
            </label>
            <button type="button" onClick={() => broadcast('pause', parseTime(manualTime))} className="min-h-10 rounded-full border border-blush/40 px-4 text-xs text-blush transition hover:bg-blush/10">
              Sync position
            </button>
          </div>
        </details>
      </section>

      {status ? <p className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-center text-xs text-pink-100/70">{status}</p> : null}
    </article>
  );
}
