import {
  Clapperboard,
  ExternalLink,
  FileVideo,
  Link2,
  Pause,
  Play,
  RotateCcw,
  Save,
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

export default function WatchPartyPanel() {
  const { user, coupleId } = useAuth();
  const [room, setRoom] = useState(emptyWatchParty);
  const [draft, setDraft] = useState(emptyWatchParty);
  const [localVideoUrl, setLocalVideoUrl] = useState('');
  const [status, setStatus] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [manualTime, setManualTime] = useState('0');
  const videoRef = useRef(null);
  const lastCommandRef = useRef('');
  const suppressEventsUntilRef = useRef(0);
  const scheduledActionRef = useRef(0);
  const statusTimerRef = useRef(0);

  const playableUrl = room.sourceType === 'local' ? localVideoUrl : room.sourceUrl;
  const hasEmbeddedPlayer = room.sourceType !== 'external' && Boolean(playableUrl);

  function showStatus(message) {
    setStatus(message);
    window.clearTimeout(statusTimerRef.current);
    statusTimerRef.current = window.setTimeout(() => setStatus(''), 2200);
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
        setManualTime(String(Math.floor(nextRoom.playback?.currentTime || 0)));
      },
      () => showStatus('Watch Party sync is blocked. Check Firebase rules.'),
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
          video.play().catch(() => showStatus('Tap play once to allow video playback.'));
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
      showStatus('Watch Party setup saved for both of you.');
    } catch {
      showStatus('Unable to save the Watch Party setup.');
    }
  }

  function selectLocalVideo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (localVideoUrl) URL.revokeObjectURL(localVideoUrl);
    setLocalVideoUrl(URL.createObjectURL(file));
    showStatus('Local video ready on this device.');
  }

  async function broadcast(action, currentTime = videoRef.current?.currentTime ?? (Number(manualTime) || 0), delay = 0) {
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
      showStatus('Unable to send playback control.');
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
      video.play().catch(() => showStatus('Tap play once to allow playback.'));
    } else {
      video.pause();
    }
  }

  return (
    <article id="watch-party" className="scroll-mt-24 rounded-2xl border border-blush/30 bg-blush/10 p-4 lg:col-span-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-sm text-roseGold">
            <Clapperboard size={15} />
            Watch Party
          </p>
          <h3 className="mt-2 font-display text-3xl text-white">Watch together, miles apart</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-pink-100/70">
            Sync direct videos or matching local files. Streaming services open in their own app while this room coordinates the countdown and timestamp.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs text-pink-100">
          {room.playback?.action === 'play' ? 'Playing' : 'Paused'} · {formatTime(room.playback?.currentTime)}
        </div>
      </div>

      <form onSubmit={saveSetup} className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          value={draft.title}
          onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          placeholder="Series / movie title"
          className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-blush/70"
        />
        <select
          value={draft.sourceType}
          onChange={(event) => setDraft((current) => ({ ...current, sourceType: event.target.value }))}
          className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-blush/70"
        >
          <option value="external">Streaming app / website</option>
          <option value="direct">Direct video URL</option>
          <option value="local">Local video file</option>
        </select>
        {draft.sourceType !== 'local' ? (
          <input
            value={draft.sourceUrl}
            onChange={(event) => setDraft((current) => ({ ...current, sourceUrl: event.target.value }))}
            placeholder={draft.sourceType === 'direct' ? 'Direct .mp4 / .webm video URL' : 'Netflix, Prime, YouTube, or other link'}
            className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-blush/70 md:col-span-2"
          />
        ) : (
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/35 px-4 py-2 text-sm text-pink-100 md:col-span-2">
            <FileVideo size={16} />
            {localVideoUrl ? 'Local file selected' : 'Choose the episode on this device'}
            <input type="file" accept="video/*" className="hidden" onChange={selectLocalVideo} />
          </label>
        )}
        <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-5 py-2 text-sm font-semibold text-midnight md:col-span-2">
          <Save size={15} />
          Save room setup
        </button>
      </form>

      {room.sourceType === 'local' && !localVideoUrl ? (
        <label className="mt-4 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-blush/35 bg-black/25 px-4 text-sm text-blush">
          <FileVideo size={16} />
          Select your matching local video
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
          className="mt-4 max-h-[60vh] w-full rounded-2xl bg-black object-contain"
        />
      ) : room.sourceType === 'external' ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
          <p className="text-sm text-pink-100">
            Open the same title on both devices. The controls below coordinate when to start and where to seek.
          </p>
          {room.sourceUrl ? (
            <a href={room.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-blush/50 px-4 text-sm text-blush">
              <ExternalLink size={15} />
              Open streaming site
            </a>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-dashed border-white/15 bg-black/25 px-4 py-6 text-center text-sm text-pink-100/65">
          Add a direct video link to load the shared player.
        </p>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <button type="button" onClick={() => broadcast('play', undefined, 3000)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-blush px-4 text-sm font-semibold text-midnight">
          <Timer size={15} />
          {countdown ? `Starting in ${countdown}` : 'Start in 3 seconds'}
        </button>
        <button type="button" onClick={() => broadcast('play')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-sm text-pink-100">
          <Play size={15} />
          Play together
        </button>
        <button type="button" onClick={() => broadcast('pause')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-sm text-pink-100">
          <Pause size={15} />
          Pause together
        </button>
        <button type="button" onClick={syncToRoom} disabled={!hasEmbeddedPlayer} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-sm text-pink-100 disabled:opacity-40">
          <RotateCcw size={15} />
          Match room
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/25 p-3 sm:flex-row sm:items-center">
        <Link2 size={15} className="shrink-0 text-roseGold" />
        <label className="text-xs text-pink-100/70" htmlFor="watch-party-time">Shared timestamp in seconds</label>
        <input
          id="watch-party-time"
          type="number"
          min="0"
          value={manualTime}
          onChange={(event) => setManualTime(event.target.value)}
          className="min-h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/35 px-3 text-sm text-white outline-none"
        />
        <button type="button" onClick={() => broadcast('pause', Number(manualTime) || 0)} className="min-h-10 rounded-full border border-blush/45 px-4 text-xs text-blush">
          Sync timestamp
        </button>
      </div>

      {status ? <p className="mt-3 text-center text-xs text-blush">{status}</p> : null}
    </article>
  );
}
