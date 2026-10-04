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
  Wifi,
  Youtube,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import YouTubeSyncPlayer, { extractYouTubeVideoId } from './watch/YouTubeSyncPlayer.jsx';
import {
  emptyWatchParty,
  saveWatchPartySetup,
  sendWatchPartyCommand,
  sendWatchPartyHeartbeat,
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
  if (type === 'youtube') return 'YouTube';
  if (type === 'direct') return 'Video link';
  if (type === 'local') return 'Video on this device';
  return 'Streaming service';
}

function normalizeHttpUrl(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  try {
    const url = new URL(input.startsWith('http://') || input.startsWith('https://') ? input : `https://${input}`);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
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
  const [syncState, setSyncState] = useState('Ready');
  const videoRef = useRef(null);
  const youtubeRef = useRef(null);
  const lastCommandRef = useRef('');
  const suppressEventsUntilRef = useRef(0);
  const scheduledActionRef = useRef(0);
  const statusTimerRef = useRef(0);
  const countdownTimerRef = useRef(0);
  const heartbeatTimerRef = useRef(0);
  const playbackRateTimerRef = useRef(0);
  const previousSessionRef = useRef('');
  const localFileSessionRef = useRef('');

  const playableUrl = room.sourceType === 'local' ? localVideoUrl : room.sourceUrl;
  const youtubeVideoId = room.sourceType === 'youtube' ? extractYouTubeVideoId(room.sourceUrl) : '';
  const hasNativePlayer = ['direct', 'local'].includes(room.sourceType) && Boolean(playableUrl);
  const hasYouTubePlayer = room.sourceType === 'youtube' && Boolean(youtubeVideoId);
  const hasSynchronizedPlayer = hasNativePlayer || hasYouTubePlayer;
  const configured = Boolean(room.title || room.sourceUrl || room.sourceType === 'local');
  const leaderIsMe = Boolean(user?.uid && room.playback?.updatedBy === user.uid);
  const leaderLabel = room.playback?.updatedBy
    ? leaderIsMe
      ? 'You lead sync'
      : `${room.playback.updatedByName || 'Partner'} leads sync`
    : 'Waiting for playback';

  function showStatus(message) {
    setStatus(message);
    window.clearTimeout(statusTimerRef.current);
    statusTimerRef.current = window.setTimeout(() => setStatus(''), 3000);
  }

  function getPlayerCurrentTime() {
    if (room.sourceType === 'youtube') {
      return youtubeRef.current?.getCurrentTime?.() ?? parseTime(manualTime);
    }
    return videoRef.current?.currentTime ?? parseTime(manualTime);
  }

  function playerIsPlaying() {
    if (room.sourceType === 'youtube') return Boolean(youtubeRef.current?.isPlaying?.());
    return Boolean(videoRef.current && !videoRef.current.paused);
  }

  function resetNativePlaybackRate() {
    window.clearTimeout(playbackRateTimerRef.current);
    if (videoRef.current && videoRef.current.playbackRate !== 1) videoRef.current.playbackRate = 1;
  }

  function applyEmbeddedPlayback(action, currentTime) {
    const target = Math.max(0, Number(currentTime) || 0);
    suppressEventsUntilRef.current = Date.now() + 1800;

    if (room.sourceType === 'youtube') {
      const player = youtubeRef.current;
      if (!player?.isReady?.()) return false;
      if (Math.abs((player.getCurrentTime?.() || 0) - target) > 0.65) player.seekTo?.(target);
      if (action === 'play') player.play?.();
      else player.pause?.();
      return true;
    }

    const video = videoRef.current;
    if (!video) return false;
    resetNativePlaybackRate();
    if (Math.abs(video.currentTime - target) > 0.65) video.currentTime = target;
    if (action === 'play') {
      video.play().catch(() => showStatus('Tap the player once if your browser blocks automatic playback.'));
    } else {
      video.pause();
    }
    return true;
  }

  function startCountdown(delay) {
    window.clearInterval(countdownTimerRef.current);
    const seconds = Math.max(0, Math.ceil(delay / 1000));
    setCountdown(seconds);
    if (!seconds) return;

    countdownTimerRef.current = window.setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          window.clearInterval(countdownTimerRef.current);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
  }

  async function publishHeartbeat({ buffering = false, currentTime = getPlayerCurrentTime() } = {}) {
    if (!leaderIsMe || !room.sessionId || room.playback?.action !== 'play') return;
    try {
      await sendWatchPartyHeartbeat(coupleId, user, {
        currentTime,
        playing: !buffering && playerIsPlaying(),
        buffering,
        sessionId: room.sessionId,
      });
      setSyncState(buffering ? 'Waiting on this connection' : 'Live sync active');
    } catch {
      setSyncState('Sync retrying');
    }
  }

  useEffect(() => {
    const unsubscribe = subscribeWatchParty(
      coupleId,
      (nextRoom) => {
        const sessionChanged = Boolean(
          nextRoom.sessionId && previousSessionRef.current !== nextRoom.sessionId,
        );

        if (
          sessionChanged &&
          nextRoom.sourceType === 'local' &&
          localFileSessionRef.current !== nextRoom.sessionId
        ) {
          setLocalVideoUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return '';
          });
        }

        previousSessionRef.current = nextRoom.sessionId || previousSessionRef.current;
        setRoom(nextRoom);
        setDraft((current) => ({
          ...current,
          title: nextRoom.title,
          sourceType: nextRoom.sourceType,
          sourceUrl: nextRoom.sourceUrl,
          sessionId: nextRoom.sessionId,
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
    if (room.sessionId && command.sessionId !== room.sessionId) return undefined;
    lastCommandRef.current = command.commandId;

    const delay = command.sentAt
      ? Math.max(0, Number(command.delayMs) || 0)
      : Math.max(0, (command.executeAt || Date.now()) - Date.now());

    if (delay) startCountdown(delay);
    window.clearTimeout(scheduledActionRef.current);
    scheduledActionRef.current = window.setTimeout(() => {
      applyEmbeddedPlayback(command.action, command.currentTime);
      const actor = command.updatedBy === user?.uid ? 'You' : command.updatedByName || 'Partner';
      showStatus(`${actor} ${command.action === 'play' ? 'started' : 'paused'} at ${formatTime(command.currentTime)}`);
      setSyncState(command.action === 'play' ? 'Auto-sync active' : 'Paused together');
    }, delay);

    return () => window.clearTimeout(scheduledActionRef.current);
  }, [room.playback, room.sessionId, room.sourceType, user?.uid]);

  useEffect(() => {
    window.clearInterval(heartbeatTimerRef.current);
    if (!hasSynchronizedPlayer || !leaderIsMe || room.playback?.action !== 'play' || !room.sessionId) {
      return undefined;
    }

    const heartbeat = () => {
      if (playerIsPlaying()) publishHeartbeat();
    };

    heartbeat();
    heartbeatTimerRef.current = window.setInterval(heartbeat, 3000);
    return () => window.clearInterval(heartbeatTimerRef.current);
  }, [coupleId, hasSynchronizedPlayer, leaderIsMe, room.playback?.action, room.sessionId, room.sourceType, user?.uid]);

  useEffect(() => {
    const sync = room.sync;
    const leader = room.playback?.updatedBy;
    if (
      !hasSynchronizedPlayer ||
      !sync?.sentAt ||
      !leader ||
      sync.updatedBy === user?.uid ||
      sync.updatedBy !== leader ||
      (room.sessionId && sync.sessionId !== room.sessionId)
    ) {
      return undefined;
    }

    if (sync.buffering && room.playback?.action === 'play') {
      applyEmbeddedPlayback('pause', sync.currentTime);
      setSyncState('Waiting for partner');
      return undefined;
    }

    if (!sync.playing || room.playback?.action !== 'play') return undefined;

    const localTime = getPlayerCurrentTime();
    const drift = Number(sync.currentTime || 0) - localTime;
    const magnitude = Math.abs(drift);

    if (!playerIsPlaying()) {
      applyEmbeddedPlayback('play', sync.currentTime);
      setSyncState('Playback recovered');
      return undefined;
    }

    const hardDriftThreshold = room.sourceType === 'youtube' ? 1.2 : 1.8;
    if (magnitude >= hardDriftThreshold) {
      applyEmbeddedPlayback('play', sync.currentTime);
      setSyncState(`Corrected ${magnitude.toFixed(1)}s drift`);
      return undefined;
    }

    if (hasNativePlayer && magnitude >= 0.7 && videoRef.current) {
      window.clearTimeout(playbackRateTimerRef.current);
      videoRef.current.playbackRate = drift > 0 ? 1.05 : 0.95;
      playbackRateTimerRef.current = window.setTimeout(() => {
        if (videoRef.current) videoRef.current.playbackRate = 1;
      }, 2200);
      setSyncState('Fine-tuning sync');
      return () => window.clearTimeout(playbackRateTimerRef.current);
    }

    setSyncState('In sync');
    return undefined;
  }, [hasNativePlayer, hasSynchronizedPlayer, room.playback?.action, room.playback?.updatedBy, room.sessionId, room.sourceType, room.sync, user?.uid]);

  useEffect(
    () => () => {
      window.clearTimeout(statusTimerRef.current);
      window.clearTimeout(scheduledActionRef.current);
      window.clearTimeout(playbackRateTimerRef.current);
      window.clearInterval(countdownTimerRef.current);
      window.clearInterval(heartbeatTimerRef.current);
      if (localVideoUrl) URL.revokeObjectURL(localVideoUrl);
    },
    [localVideoUrl],
  );

  async function saveSetup(event) {
    event.preventDefault();
    let nextDraft = { ...draft };

    if (draft.sourceType === 'youtube') {
      const videoId = extractYouTubeVideoId(draft.sourceUrl);
      if (!videoId) {
        showStatus('Paste a valid YouTube video link or video ID.');
        return;
      }
      nextDraft.sourceUrl = `https://www.youtube.com/watch?v=${videoId}`;
    } else if (['direct', 'external'].includes(draft.sourceType)) {
      const normalizedUrl = normalizeHttpUrl(draft.sourceUrl);
      if (!normalizedUrl) {
        showStatus('Add a valid http or https link for this source.');
        return;
      }
      nextDraft.sourceUrl = normalizedUrl;
    } else if (draft.sourceType === 'local' && !localVideoUrl) {
      showStatus('Choose the video file on this device before saving the room.');
      return;
    }

    const sourceChanged =
      !room.sessionId ||
      room.sourceType !== nextDraft.sourceType ||
      room.sourceUrl !== nextDraft.sourceUrl ||
      nextDraft.sourceType === 'local';
    const sessionId = sourceChanged ? crypto.randomUUID() : room.sessionId;
    nextDraft = { ...nextDraft, sessionId };

    if (nextDraft.sourceType === 'local') localFileSessionRef.current = sessionId;

    try {
      await saveWatchPartySetup(coupleId, user, nextDraft, { resetPlayback: sourceChanged });
      if (sourceChanged) {
        lastCommandRef.current = '';
        setManualTime('0:00');
        setSyncState('New session ready');
      }
      setSetupOpen(false);
      showStatus(sourceChanged ? 'New watch session ready for both of you.' : 'Watch room updated.');
    } catch {
      showStatus('Unable to save this watch room.');
    }
  }

  function selectLocalVideo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (localVideoUrl) URL.revokeObjectURL(localVideoUrl);
    setLocalVideoUrl(URL.createObjectURL(file));
    showStatus('Video selected. Your partner should choose the matching file on their device.');
  }

  async function broadcast(action, currentTime = getPlayerCurrentTime(), delay = 0) {
    if (!configured) {
      showStatus('Set up the watch room first.');
      return;
    }

    try {
      if (delay && hasSynchronizedPlayer) {
        suppressEventsUntilRef.current = Date.now() + 1400;
        if (room.sourceType === 'youtube') youtubeRef.current?.pause?.();
        else videoRef.current?.pause?.();
      }

      await sendWatchPartyCommand(coupleId, user, {
        action,
        currentTime,
        executeAt: Date.now() + delay,
        delayMs: delay,
        sessionId: room.sessionId,
      });
      setSyncState(delay ? 'Countdown shared' : 'Sharing playback');
    } catch {
      showStatus('Unable to send the playback update.');
      setSyncState('Sync interrupted');
    }
  }

  function onPlayerPlayback(action, currentTime = getPlayerCurrentTime()) {
    if (Date.now() < suppressEventsUntilRef.current) return;
    broadcast(action, currentTime);
  }

  function onYouTubeSeek(currentTime, playing) {
    if (Date.now() < suppressEventsUntilRef.current) return;
    setSyncState('Sharing seek');
    broadcast(playing ? 'play' : 'pause', currentTime);
  }

  function onPlayerBuffering(buffering, currentTime = getPlayerCurrentTime()) {
    if (!hasSynchronizedPlayer) return;
    if (!leaderIsMe) {
      setSyncState(buffering ? 'Buffering locally' : 'Auto-sync active');
      return;
    }
    publishHeartbeat({ buffering, currentTime });
  }

  function syncToRoom({ quiet = false } = {}) {
    const command = room.playback;
    if (!hasSynchronizedPlayer || !command) return;
    if (room.sessionId && command.sessionId !== room.sessionId) return;
    const applied = applyEmbeddedPlayback(command.action, command.currentTime || 0);
    if (applied) {
      setSyncState('Matched shared room');
      if (!quiet) showStatus(`Matched the shared room at ${formatTime(command.currentTime)}`);
    }
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
            <h3 className="mt-2 truncate font-display text-3xl text-white sm:text-4xl">
              {room.title || 'Choose something to watch'}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-pink-100/55">
              <span className="rounded-full bg-white/[0.05] px-3 py-1.5">{sourceLabel(room.sourceType)}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-300/10 px-3 py-1.5 text-emerald-200">
                <CheckCircle2 size={12} />
                {room.playback?.action === 'play' ? 'Playing' : 'Paused'} · {formatTime(room.playback?.currentTime)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-300/10 px-3 py-1.5 text-sky-200">
                <Wifi size={12} />
                {hasSynchronizedPlayer ? syncState : 'Manual sync'}
              </span>
            </div>
            {hasSynchronizedPlayer ? <p className="mt-2 text-xs text-pink-100/45">{leaderLabel}</p> : null}
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
                placeholder="Movie, episode, or video title"
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
                <option value="youtube">YouTube</option>
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
                  placeholder={
                    draft.sourceType === 'youtube'
                      ? 'https://youtube.com/watch?v=...'
                      : draft.sourceType === 'direct'
                        ? 'Direct .mp4 or .webm link'
                        : 'Link to the streaming page'
                  }
                  className="mt-1.5 min-h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-3 text-sm text-white outline-none focus:border-blush/60"
                />
                {draft.sourceType === 'youtube' ? (
                  <span className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-pink-100/45">
                    <Youtube size={13} /> Supports videos, Shorts, Live links, youtu.be links, and video IDs.
                  </span>
                ) : null}
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

            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-5 text-sm font-semibold text-midnight md:col-span-2"
            >
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

      {hasYouTubePlayer ? (
        <YouTubeSyncPlayer
          key={`${room.sessionId}:${youtubeVideoId}`}
          ref={youtubeRef}
          videoId={youtubeVideoId}
          onReady={() => window.setTimeout(() => syncToRoom({ quiet: true }), 150)}
          onPlaybackAction={onPlayerPlayback}
          onSeek={onYouTubeSeek}
          onBufferingChange={onPlayerBuffering}
          onError={showStatus}
        />
      ) : hasNativePlayer ? (
        <video
          ref={videoRef}
          src={playableUrl}
          controls
          playsInline
          preload="metadata"
          onPlay={() => onPlayerPlayback('play')}
          onPause={() => onPlayerPlayback('pause')}
          onSeeked={() => onPlayerPlayback(videoRef.current?.paused ? 'pause' : 'play')}
          onWaiting={() => onPlayerBuffering(true)}
          onPlaying={() => onPlayerBuffering(false)}
          className="max-h-[65vh] w-full rounded-3xl bg-black object-contain shadow-[0_22px_70px_rgba(0,0,0,.35)]"
        />
      ) : room.sourceType === 'youtube' ? (
        <section className="rounded-3xl border border-dashed border-white/12 bg-black/20 px-5 py-10 text-center">
          <Youtube className="mx-auto text-roseGold" size={30} />
          <p className="mt-3 font-display text-2xl text-white">Add a valid YouTube link.</p>
          <button type="button" onClick={() => setSetupOpen(true)} className="mt-3 text-sm text-blush">Open room setup</button>
        </section>
      ) : room.sourceType === 'external' ? (
        <section className="glass rounded-3xl p-4 sm:p-5">
          <p className="text-sm leading-6 text-pink-100/68">
            Open the same title on both devices. OHS shares the countdown and timestamp, while the streaming service plays in its own app or tab.
          </p>
          {room.sourceUrl ? (
            <a
              href={room.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-blush/45 px-4 text-sm text-blush transition hover:bg-blush/10"
            >
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
          <button
            type="button"
            onClick={() => broadcast('play', undefined, 3000)}
            disabled={!configured}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-4 text-sm font-semibold text-midnight transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Timer size={15} />
            Start together
          </button>
          <button
            type="button"
            onClick={() => broadcast('play')}
            disabled={!configured}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 text-sm text-pink-100 transition hover:border-blush/40 disabled:opacity-35"
          >
            <Play size={15} />
            Play
          </button>
          <button
            type="button"
            onClick={() => broadcast('pause')}
            disabled={!configured}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 text-sm text-pink-100 transition hover:border-blush/40 disabled:opacity-35"
          >
            <Pause size={15} />
            Pause
          </button>
          <button
            type="button"
            onClick={() => syncToRoom()}
            disabled={!hasSynchronizedPlayer}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 text-sm text-pink-100 transition hover:border-blush/40 disabled:opacity-35"
          >
            <RotateCcw size={15} />
            Match room
          </button>
        </div>

        <div className="mt-3 rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.04] px-4 py-3 text-xs leading-5 text-pink-100/60">
          {hasSynchronizedPlayer
            ? 'Live sync follows the most recent controller, shares seeks immediately, holds playback when the leader buffers, and automatically corrects meaningful drift.'
            : 'This source opens outside OHS, so use Start together and the shared position if either device drifts.'}
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
            <button
              type="button"
              onClick={() => broadcast('pause', parseTime(manualTime))}
              className="min-h-10 rounded-full border border-blush/40 px-4 text-xs text-blush transition hover:bg-blush/10"
            >
              Sync position
            </button>
          </div>
        </details>
      </section>

      {status ? (
        <p className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-center text-xs text-pink-100/70">{status}</p>
      ) : null}
    </article>
  );
}
