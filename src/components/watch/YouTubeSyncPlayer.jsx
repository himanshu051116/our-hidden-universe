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

function loadYouTubeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('YouTube player requires a browser.'));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (window.__ohuYouTubeApiPromise) return window.__ohuYouTubeApiPromise;

  window.__ohuYouTubeApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    let timeoutId = 0;

    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      window.clearTimeout(timeoutId);
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error('YouTube player API did not initialize.'));
    };

    if (!document.querySelector('script[data-ohu-youtube-api]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.dataset.ohuYoutubeApi = 'true';
      script.onerror = () => reject(new Error('Unable to load YouTube player API.'));
      document.head.appendChild(script);
    }

    timeoutId = window.setTimeout(() => {
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error('YouTube player took too long to load.'));
    }, 15000);
  });

  return window.__ohuYouTubeApiPromise;
}

const YouTubeSyncPlayer = forwardRef(function YouTubeSyncPlayer(
  { videoId, onReady, onPlaybackAction, onError },
  ref,
) {
  const mountRef = useRef(null);
  const playerRef = useRef(null);
  const callbacksRef = useRef({ onReady, onPlaybackAction, onError });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    callbacksRef.current = { onReady, onPlaybackAction, onError };
  }, [onReady, onPlaybackAction, onError]);

  useImperativeHandle(
    ref,
    () => ({
      getCurrentTime() {
        return Number(playerRef.current?.getCurrentTime?.()) || 0;
      },
      isPlaying() {
        return playerRef.current?.getPlayerState?.() === window.YT?.PlayerState?.PLAYING;
      },
      play() {
        playerRef.current?.playVideo?.();
      },
      pause() {
        playerRef.current?.pauseVideo?.();
      },
      seekTo(seconds) {
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
              callbacksRef.current.onReady?.();
            },
            onStateChange: (event) => {
              if (cancelled) return;
              const currentTime = Number(player?.getCurrentTime?.()) || 0;
              if (event.data === YT.PlayerState.PLAYING) {
                callbacksRef.current.onPlaybackAction?.('play', currentTime);
              } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                callbacksRef.current.onPlaybackAction?.('pause', currentTime);
              }
            },
            onError: () => callbacksRef.current.onError?.('This YouTube video cannot be played in the embedded player.'),
          },
        });
        playerRef.current = player;
      })
      .catch((error) => callbacksRef.current.onError?.(error?.message || 'Unable to load YouTube.'));

    return () => {
      cancelled = true;
      setReady(false);
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
