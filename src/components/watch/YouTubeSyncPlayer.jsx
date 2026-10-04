import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;

export function extractYouTubeVideoId(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  if (videoIdPattern.test(input)) return input;

  try {
    const url = new URL(input.startsWith('http') ? input : `https://${input}`);
    const hostname = url.hostname.replace(/^www\./, '').replace(/^m\./, '');

    if (hostname === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0] || '';
      return videoIdPattern.test(id) ? id : '';
    }

    if (hostname === 'youtube.com' || hostname === 'music.youtube.com' || hostname === 'youtube-nocookie.com') {
      const watchId = url.searchParams.get('v') || '';
      if (videoIdPattern.test(watchId)) return watchId;

      const parts = url.pathname.split('/').filter(Boolean);
      if (['embed', 'shorts', 'live', 'v'].includes(parts[0])) {
        const id = parts[1] || '';
        return videoIdPattern.test(id) ? id : '';
      }
    }
  } catch {
    return '';
  }

  return '';
}

function clearApiPromise() {
  if (typeof window !== 'undefined') window.__ohuYouTubeApiPromise = null;
}

function loadYouTubeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('YouTube player requires a browser.'));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (window.__ohuYouTubeApiPromise) return window.__ohuYouTubeApiPromise;

  window.__ohuYouTubeApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    let timeoutId = 0;
    let settled = false;

    const fail = (message) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      clearApiPromise();
      reject(new Error(message));
    };

    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (settled) return;
      window.clearTimeout(timeoutId);
      if (window.YT?.Player) {
        settled = true;
        resolve(window.YT);
      } else {
        fail('YouTube player API did not initialize.');
      }
    };

    if (!document.querySelector('script[data-ohu-youtube-api]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.dataset.ohuYoutubeApi = 'true';
      script.onerror = () => {
        script.remove();
        fail('Unable to load YouTube player API.');
      };
      document.head.appendChild(script);
    }

    timeoutId = window.setTimeout(() => {
      if (window.YT?.Player && !settled) {
        settled = true;
        resolve(window.YT);
      } else {
        document.querySelector('script[data-ohu-youtube-api]')?.remove();
        fail('YouTube player took too long to load.');
      }
    }, 15000);
  });

  return window.__ohuYouTubeApiPromise;
}

function youtubeErrorMessage(code) {
  if (code === 2) return 'This YouTube link is not valid.';
  if (code === 5) return 'YouTube could not play this video in HTML5.';
  if (code === 100) return 'This YouTube video is unavailable.';
  if (code === 101 || code === 150) return 'The uploader does not allow this video to play inside OHS.';
  return 'This YouTube video cannot be played in the embedded player.';
}

const YouTubeSyncPlayer = forwardRef(function YouTubeSyncPlayer(
  { videoId, onReady, onPlaybackAction, onSeek, onBufferingChange, onError },
  ref,
) {
  const mountRef = useRef(null);
  const playerRef = useRef(null);
  const callbacksRef = useRef({ onReady, onPlaybackAction, onSeek, onBufferingChange, onError });
  const suppressUntilRef = useRef(0);
  const monitorRef = useRef({ time: 0, wall: 0, state: null });
  const monitorTimerRef = useRef(0);
  const seekDebounceRef = useRef(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    callbacksRef.current = { onReady, onPlaybackAction, onSeek, onBufferingChange, onError };
  }, [onReady, onPlaybackAction, onSeek, onBufferingChange, onError]);

  function suppressRemoteEvents(ms = 1800) {
    suppressUntilRef.current = Date.now() + ms;
  }

  function queueSeek(currentTime, playing) {
    window.clearTimeout(seekDebounceRef.current);
    seekDebounceRef.current = window.setTimeout(() => {
      callbacksRef.current.onSeek?.(currentTime, playing);
    }, 220);
  }

  useImperativeHandle(
    ref,
    () => ({
      getCurrentTime() {
        return Number(playerRef.current?.getCurrentTime?.()) || 0;
      },
      isPlaying() {
        return playerRef.current?.getPlayerState?.() === window.YT?.PlayerState?.PLAYING;
      },
      isBuffering() {
        return playerRef.current?.getPlayerState?.() === window.YT?.PlayerState?.BUFFERING;
      },
      play() {
        suppressRemoteEvents();
        playerRef.current?.playVideo?.();
      },
      pause() {
        suppressRemoteEvents();
        playerRef.current?.pauseVideo?.();
      },
      seekTo(seconds) {
        suppressRemoteEvents(2200);
        playerRef.current?.seekTo?.(Math.max(0, Number(seconds) || 0), true);
      },
      isReady() {
        return Boolean(playerRef.current && ready);
      },
    }),
    [ready],
  );

  useEffect(() => {
    let cancelled = false;
    let player = null;
    setReady(false);
    window.clearInterval(monitorTimerRef.current);
    window.clearTimeout(seekDebounceRef.current);

    if (!videoId || !mountRef.current) return undefined;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !mountRef.current) return;
        player = new YT.Player(mountRef.current, {
          width: '100%',
          height: '100%',
          videoId,
          playerVars: {
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              playerRef.current = player;
              setReady(true);
              monitorRef.current = {
                time: Number(player?.getCurrentTime?.()) || 0,
                wall: Date.now(),
                state: player?.getPlayerState?.(),
              };
              callbacksRef.current.onReady?.();
            },
            onStateChange: (event) => {
              if (cancelled) return;
              const currentTime = Number(player?.getCurrentTime?.()) || 0;
              const buffering = event.data === YT.PlayerState.BUFFERING;
              if (buffering) callbacksRef.current.onBufferingChange?.(true, currentTime);
              else if ([YT.PlayerState.PLAYING, YT.PlayerState.PAUSED, YT.PlayerState.ENDED].includes(event.data)) {
                callbacksRef.current.onBufferingChange?.(false, currentTime);
              }

              monitorRef.current = { time: currentTime, wall: Date.now(), state: event.data };
              if (Date.now() < suppressUntilRef.current) return;

              if (event.data === YT.PlayerState.PLAYING) {
                callbacksRef.current.onPlaybackAction?.('play', currentTime);
              } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                callbacksRef.current.onPlaybackAction?.('pause', currentTime);
              }
            },
            onError: (event) => callbacksRef.current.onError?.(youtubeErrorMessage(event.data)),
          },
        });
        playerRef.current = player;

        monitorTimerRef.current = window.setInterval(() => {
          if (cancelled || !playerRef.current || Date.now() < suppressUntilRef.current) return;
          const currentTime = Number(playerRef.current.getCurrentTime?.()) || 0;
          const state = playerRef.current.getPlayerState?.();
          const now = Date.now();
          const previous = monitorRef.current;

          if (previous.wall && previous.state === state) {
            if (state === YT.PlayerState.PLAYING) {
              const expected = previous.time + (now - previous.wall) / 1000;
              if (Math.abs(currentTime - expected) >= 1.15) queueSeek(currentTime, true);
            } else if (state === YT.PlayerState.PAUSED && Math.abs(currentTime - previous.time) >= 0.7) {
              queueSeek(currentTime, false);
            }
          }

          monitorRef.current = { time: currentTime, wall: now, state };
        }, 450);
      })
      .catch((error) => callbacksRef.current.onError?.(error?.message || 'Unable to load YouTube.'));

    return () => {
      cancelled = true;
      setReady(false);
      window.clearInterval(monitorTimerRef.current);
      window.clearTimeout(seekDebounceRef.current);
      try {
        player?.destroy?.();
      } catch {
        // The iframe may already have been removed during route transitions.
      }
      playerRef.current = null;
    };
  }, [videoId]);

  return (
    <div className="overflow-hidden rounded-3xl bg-black shadow-[0_22px_70px_rgba(0,0,0,.35)]">
      <div className="aspect-video min-h-[200px] w-full">
        <div ref={mountRef} className="h-full w-full" />
      </div>
    </div>
  );
});

export default YouTubeSyncPlayer;
