import { Heart, Radio, Stars } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { sendSkySignal, subscribeNightSky } from '../services/nightSkyService.js';

function signalEmoji(signal) {
  if (!signal) return '✨';
  if (signal.type === 'heartbeat') return '💓';
  if (signal.type === 'missYou') return '💌';
  return '✨';
}

export default function HomeSkyPreview({ onSunSecret }) {
  const { user, coupleId } = useAuth();
  const [sky, setSky] = useState({ stars: [], signals: [] });
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setStatus('');
    const unsubscribe = subscribeNightSky(
      coupleId,
      (nextSky) => setSky(nextSky),
      () => setStatus('Sky is temporarily unavailable.'),
    );
    return () => unsubscribe?.();
  }, [coupleId]);

  const latestSignal = sky.signals?.[0];
  const stars = sky.stars || [];
  const previewStars = useMemo(() => stars.slice(0, 7), [stars]);

  async function sendHeartbeat() {
    if (sending) return;
    setSending(true);
    setStatus('');
    try {
      await sendSkySignal(coupleId, user, 'heartbeat');
      setStatus('Heartbeat sent.');
    } catch {
      setStatus('Could not send the heartbeat. Try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="glass overflow-hidden rounded-3xl">
      <div className="relative min-h-[280px] overflow-hidden bg-[#030510] p-4 sm:min-h-[310px] sm:p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,182,200,.18),transparent_16rem),radial-gradient(circle_at_78%_35%,rgba(164,220,255,.14),transparent_18rem),linear-gradient(145deg,#020410,#0b1024_42%,#170a1d_74%,#05040a)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[radial-gradient(ellipse_at_center_bottom,rgba(255,182,200,.18),transparent_65%)]" />

        {Array.from({ length: 24 }, (_, index) => (
          <span
            key={`ambient-${index}`}
            className="pointer-events-none absolute h-1 w-1 rounded-full bg-white/65"
            style={{
              left: `${5 + ((index * 17) % 90)}%`,
              top: `${10 + ((index * 29) % 72)}%`,
              opacity: 0.28 + ((index % 5) * 0.1),
            }}
          />
        ))}

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-roseGold">
              <Stars size={14} />
              Night Sky
            </p>
            <h2 className="mt-2 font-display text-3xl text-white sm:text-4xl">A glimpse of your sky</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-pink-100/60">
              {stars.length
                ? `${stars.length} ${stars.length === 1 ? 'star' : 'stars'} are waiting in your shared sky.`
                : 'Your shared sky is quiet. Open it when you want to leave a star or signal.'}
            </p>
          </div>

          {onSunSecret ? (
            <button
              type="button"
              onClick={onSunSecret}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-roseGold/35 bg-roseGold/10 text-roseGold transition hover:bg-roseGold/20"
              aria-label="Open sun secret"
            >
              <Heart size={17} fill="currentColor" />
            </button>
          ) : null}
        </div>

        <div className="relative z-10 mt-5 h-24 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/20">
          {previewStars.length ? previewStars.map((star, index) => (
            <span
              key={star.id || `${star.title}-${index}`}
              className="absolute h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,.75)]"
              style={{
                left: `${10 + ((index * 14) % 80)}%`,
                top: `${18 + ((index * 23) % 62)}%`,
              }}
              title={star.title || 'Shared star'}
            />
          )) : (
            <div className="grid h-full place-items-center px-4 text-center text-xs text-pink-100/45">
              Your first shared star will appear here.
            </div>
          )}

          {latestSignal ? (
            <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2 rounded-full border border-blush/20 bg-blush/10 px-3 py-2 text-xs text-pink-100/80">
              <span className="text-lg" aria-hidden="true">{signalEmoji(latestSignal)}</span>
              Latest signal
            </div>
          ) : null}
        </div>

        <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={sendHeartbeat}
            disabled={sending}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-4 text-sm font-semibold text-midnight transition hover:brightness-105 disabled:opacity-50"
          >
            <Radio size={15} />
            {sending ? 'Sending…' : 'Send heartbeat'}
          </button>
          <Link
            to="/universe/sky"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 text-sm font-semibold text-pink-100 transition hover:border-blush/45 hover:text-white"
          >
            <Stars size={15} />
            Open full sky
          </Link>
          {status ? <span className="text-xs text-pink-100/55">{status}</span> : null}
        </div>
      </div>
    </section>
  );
}
