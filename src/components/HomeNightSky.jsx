import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Moon, Plus, Radio, Send, Sparkles, Stars } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import useLiteEffects from '../hooks/useLiteEffects.js';
import {
  createSkyStar,
  sendSkySignal,
  subscribeNightSky,
  touchSkyStar,
} from '../services/nightSkyService.js';

const moods = {
  soft: { color: '#ffb6c8', glow: 'rgba(255,182,200,.52)' },
  happy: { color: '#ffd76a', glow: 'rgba(255,215,106,.5)' },
  missing: { color: '#a4dcff', glow: 'rgba(164,220,255,.52)' },
  tired: { color: '#b8a7ff', glow: 'rgba(184,167,255,.42)' },
  grateful: { color: '#d8a07f', glow: 'rgba(216,160,127,.48)' },
};

function toDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function connectedTouch(touch = {}) {
  const values = Object.entries(touch).filter(([key]) => !['starTitle', 'updatedAt'].includes(key));
  if (values.length < 2) return false;
  const times = values.map(([, value]) => toDate(value)?.getTime()).filter(Boolean).sort((a, b) => a - b);
  if (times.length < 2) return false;
  return times[times.length - 1] - times[0] < 10 * 60 * 1000;
}

function signalEmoji(signal) {
  if (!signal) return '🌌';
  if (signal.type === 'thinking') return '✨';
  if (signal.type === 'heartbeat') return '💓';
  return '💌';
}

export default function HomeNightSky({ onSunSecret }) {
  const { user, coupleId } = useAuth();
  const liteEffects = useLiteEffects();
  const [sky, setSky] = useState({ stars: [], signals: [], lanterns: {}, sleep: {}, stats: {}, touches: {} });
  const [starFormOpen, setStarFormOpen] = useState(false);
  const [starTitle, setStarTitle] = useState('');
  const [selectedStar, setSelectedStar] = useState(null);
  const [notice, setNotice] = useState('');
  const noticeTimerRef = useRef(null);
  const latestSignal = sky.signals?.[0];
  const visibleStars = sky.stars || [];
  const lanterns = Object.values(sky.lanterns || {});
  const sleeping = Object.values(sky.sleep || {}).some((state) => state.asleep);
  const ambientStars = useMemo(
    () =>
      Array.from({ length: liteEffects ? 18 : 48 }, (_, index) => ({
        id: index,
        left: 3 + ((index * 17) % 94),
        top: 6 + ((index * 29) % 84),
        delay: index * 0.06,
        duration: 3 + (index % 5),
        size: index % 7 === 0 ? 2 : 1,
      })),
    [liteEffects],
  );
  const decorativeConstellation = useMemo(
    () => [
      { x: 12, y: 62 },
      { x: 22, y: 48 },
      { x: 35, y: 56 },
      { x: 46, y: 40 },
      { x: 59, y: 52 },
      { x: 72, y: 36 },
    ],
    [],
  );
  const showDecorativeConstellation = visibleStars.length < 2;

  function showNotice(text) {
    setNotice(text);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(''), 2200);
  }

  useEffect(() => {
    const unsubscribe = subscribeNightSky(
      coupleId,
      setSky,
      () => showNotice('Sky sync blocked'),
    );
    return unsubscribe;
  }, [coupleId]);

  useEffect(
    () => () => {
      window.clearTimeout(noticeTimerRef.current);
    },
    [],
  );

  async function addStar(event) {
    event.preventDefault();
    const title = starTitle.trim();
    if (!title) return;
    try {
      await createSkyStar(coupleId, user, {
        title,
        note: 'Placed from home.',
        kind: 'thought',
      });
      setStarTitle('');
      setStarFormOpen(false);
      showNotice('Star placed');
    } catch (error) {
      showNotice(error.message || 'Unable to place star');
    }
  }

  async function quickSignal(type) {
    try {
      await sendSkySignal(coupleId, user, type);
      showNotice(type === 'heartbeat' ? 'Heartbeat sent' : type === 'missYou' ? 'Miss-you sent' : 'Thought sent');
    } catch (error) {
      showNotice(error.message || 'Unable to send signal');
    }
  }

  async function openStar(star) {
    setSelectedStar(star);
    try {
      await touchSkyStar(coupleId, user, star);
    } catch {
      showNotice('Unable to touch star');
    }
  }

  return (
    <section className="glass relative overflow-hidden rounded-3xl">
      <div className={`relative min-h-[460px] bg-[#030510] p-4 transition duration-700 sm:min-h-[520px] sm:p-5 ${sleeping ? 'brightness-75 saturate-75' : ''}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,182,200,.2),transparent_18rem),radial-gradient(circle_at_80%_24%,rgba(255,215,106,.22),transparent_14rem),radial-gradient(circle_at_66%_66%,rgba(164,220,255,.16),transparent_22rem),linear-gradient(145deg,#020410,#0b1024_35%,#190b20_68%,#05040a)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-[radial-gradient(ellipse_at_center_bottom,rgba(255,182,200,.22),transparent_62%),linear-gradient(to_top,rgba(3,5,16,.92),transparent)]" />
        <div className="pointer-events-none absolute -left-20 bottom-12 h-52 w-52 rounded-full border border-white/10 bg-white/[0.02] blur-sm" />
        <div className="pointer-events-none absolute -right-16 top-32 h-40 w-40 rounded-full border border-roseGold/10 bg-roseGold/[0.03] blur-sm" />

        <motion.span
          className="pointer-events-none absolute left-[9%] top-[22%] h-px w-32 rotate-[-18deg] bg-gradient-to-r from-transparent via-white/65 to-transparent shadow-[0_0_18px_rgba(255,255,255,.5)]"
          animate={liteEffects ? false : { x: [0, 90, 0], opacity: [0, 0.95, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.span
          className="pointer-events-none absolute right-[8%] top-[58%] h-px w-24 rotate-[-24deg] bg-gradient-to-r from-transparent via-blush/70 to-transparent shadow-[0_0_18px_rgba(255,182,200,.45)]"
          animate={liteEffects ? false : { x: [0, -70, 0], opacity: [0, 0.8, 0] }}
          transition={{ duration: 8.5, repeat: Infinity, delay: 2.4, ease: 'easeInOut' }}
        />

        <div className="pointer-events-none absolute inset-0">
          {ambientStars.map((star) => (
            <span
              key={star.id}
              className="sky-spark absolute rounded-full bg-white"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                width: `${star.size * 0.25}rem`,
                height: `${star.size * 0.25}rem`,
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration}s`,
              }}
            />
          ))}
        </div>

        <div className="pointer-events-none absolute left-[8%] bottom-[18%] h-28 w-28 rounded-full bg-[radial-gradient(circle_at_34%_34%,rgba(255,255,255,.96),rgba(255,255,255,.72)_38%,rgba(255,255,255,.12)_62%,transparent_72%)] shadow-[0_0_46px_rgba(255,255,255,.22)]">
          <span className="absolute left-8 top-0 h-28 w-28 rounded-full bg-[#071027]" />
        </div>

        <AnimatePresence>
          {latestSignal ? (
            <motion.div
              key={latestSignal.id || latestSignal.createdAt}
              className="pointer-events-none absolute left-1/2 top-[44%] z-10 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-blush/20 bg-blush/10 text-4xl shadow-[0_0_60px_rgba(255,182,200,.28)] backdrop-blur-sm"
              initial={{ opacity: 0, scale: 0.45 }}
              animate={liteEffects ? { opacity: 0.9, scale: 1 } : { opacity: [0.9, 0.55, 0.9], scale: [1, 1.14, 1] }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {signalEmoji(latestSignal)}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {onSunSecret ? (
          <button
            type="button"
            onClick={onSunSecret}
            className="absolute right-8 top-24 z-10 grid h-24 w-24 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_35%,#fff6bc_6%,#ffd76a_35%,#ff9f2f_68%,#f16b1f_100%)] text-midnight shadow-[0_0_70px_rgba(255,170,80,.75),0_0_130px_rgba(255,215,106,.25)] transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-roseGold/80 sm:right-14 sm:top-20 sm:h-32 sm:w-32"
            aria-label="Open sun secret"
            title="Sun secret"
          >
            <span className="absolute inset-[-18px] rounded-full border border-roseGold/25" />
            <span className="absolute inset-[-34px] rounded-full border border-roseGold/10" />
            <Heart size={24} fill="currentColor" />
          </button>
        ) : null}

        <div className="relative z-20 flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-roseGold">
              <Stars size={14} />
              Night Sky
            </p>
            <h2 className="mt-2 font-display text-4xl leading-none text-white sm:text-5xl">Our Hidden Universe</h2>
            <div className="mt-3 flex items-center gap-2 text-2xl" aria-hidden="true">
              <motion.span animate={liteEffects ? false : { y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>🌙</motion.span>
              <motion.span animate={liteEffects ? false : { scale: [1, 1.18, 1] }} transition={{ duration: 1.8, repeat: Infinity }}>{signalEmoji(latestSignal)}</motion.span>
              <motion.span animate={liteEffects ? false : { rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>☀️</motion.span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setStarFormOpen((open) => !open)}
              className="grid h-11 w-11 place-items-center rounded-full border border-blush/45 bg-blush/15 text-blush transition hover:bg-blush/25"
              aria-label="Add star"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="absolute inset-x-4 bottom-24 top-28 sm:inset-x-5">
          <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-60">
            {showDecorativeConstellation ? decorativeConstellation.slice(1).map((point, index) => {
              const previous = decorativeConstellation[index];
              return (
                <line
                  key={`decor-${previous.x}-${point.x}`}
                  x1={`${previous.x}%`}
                  y1={`${previous.y}%`}
                  x2={`${point.x}%`}
                  y2={`${point.y}%`}
                  stroke="rgba(164,220,255,.18)"
                  strokeWidth="1"
                  strokeDasharray="2 8"
                />
              );
            }) : null}
            {visibleStars.slice(1).map((star, index) => {
              const previous = visibleStars[index];
              if (!previous) return null;
              return (
                <line
                  key={`${previous.id}-${star.id}`}
                  x1={`${previous.x}%`}
                  y1={`${previous.y}%`}
                  x2={`${star.x}%`}
                  y2={`${star.y}%`}
                  stroke="rgba(255,182,200,.24)"
                  strokeDasharray="4 8"
                />
              );
            })}
          </svg>

          {showDecorativeConstellation ? decorativeConstellation.map((point) => (
            <span
              key={`decor-dot-${point.x}-${point.y}`}
              className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-100/80 shadow-[0_0_18px_rgba(164,220,255,.72)]"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            />
          )) : null}

          {visibleStars.map((star) => {
            const connected = connectedTouch(sky.touches?.[star.id]);
            return (
              <button
                key={star.id}
                type="button"
                onClick={() => openStar(star)}
                className="group absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"
                style={{ left: `${star.x}%`, top: `${star.y}%` }}
                aria-label={`Open ${star.title}`}
              >
                <motion.span
                  className={`absolute rounded-full ${connected ? 'h-20 w-20 border border-blush/50 bg-blush/10' : 'h-11 w-11 bg-white/5'}`}
                  animate={liteEffects ? false : { scale: connected ? [1, 1.18, 1] : [1, 1.08, 1], opacity: connected ? [0.45, 0.9, 0.45] : [0.25, 0.62, 0.25] }}
                  transition={{ duration: connected ? 2.1 : 3.4, repeat: Infinity }}
                />
                <span className={`relative h-3.5 w-3.5 rounded-full ${connected ? 'bg-blush' : 'bg-white'} shadow-[0_0_24px_rgba(255,255,255,.92)]`} />
              </button>
            );
          })}

          {!visibleStars.length ? (
            <div className="absolute inset-0 grid place-items-center text-center">
              <motion.button
                type="button"
                onClick={() => setStarFormOpen(true)}
                className="grid h-20 w-20 place-items-center rounded-full border border-blush/25 bg-blush/10 text-4xl shadow-[0_0_48px_rgba(255,182,200,.2)] backdrop-blur-sm"
                animate={liteEffects ? false : { y: [0, -8, 0], scale: [1, 1.05, 1] }}
                transition={{ duration: 2.7, repeat: Infinity, ease: 'easeInOut' }}
                aria-label="Add first star"
              >
                ✨
              </motion.button>
            </div>
          ) : null}
        </div>

        {lanterns.map((lantern, index) => {
          const mood = moods[lantern.mood] || moods.soft;
          return (
            <motion.span
              key={lantern.id || lantern.userId}
              className="pointer-events-none absolute z-0 h-12 w-8 rounded-full border border-white/15"
              style={{
                left: `${18 + index * 17}%`,
                top: `${67 + (index % 2) * 7}%`,
                background: mood.glow,
                boxShadow: `0 0 34px ${mood.glow}`,
              }}
              animate={liteEffects ? false : { y: [0, -14, 0], x: [0, 5, 0] }}
              transition={{ duration: 5.5 + index, repeat: Infinity, ease: 'easeInOut' }}
            />
          );
        })}

        {sleeping ? (
          <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_20%,rgba(184,167,255,.16),transparent_28rem)]" />
        ) : null}

        <div className="absolute inset-x-4 bottom-4 z-10 space-y-3 sm:inset-x-5">
          <AnimatePresence>
            {starFormOpen ? (
              <motion.form
                onSubmit={addStar}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="flex gap-2 rounded-2xl border border-white/10 bg-black/45 p-2 backdrop-blur-xl"
              >
                <input
                  value={starTitle}
                  onChange={(event) => setStarTitle(event.target.value)}
                  className="min-h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/35 px-3 text-sm text-white outline-none focus:border-blush/70"
                  placeholder="Star name"
                />
                <button type="submit" className="grid h-10 w-10 place-items-center rounded-xl bg-blush text-midnight" aria-label="Place star">
                  <Send size={15} />
                </button>
              </motion.form>
            ) : null}
          </AnimatePresence>

          <div className="grid grid-cols-3 gap-2">
            <SkyButton icon={<Sparkles size={15} />} label="Think" onClick={() => quickSignal('thinking')} />
            <SkyButton icon={<Radio size={15} />} label="Pulse" onClick={() => quickSignal('heartbeat')} />
            <SkyButton icon={<Heart size={15} />} label="Miss" onClick={() => quickSignal('missYou')} />
          </div>
        </div>

        {notice ? (
          <p className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-blush/35 bg-midnight/90 px-4 py-2 text-xs text-blush">
            {notice}
          </p>
        ) : null}
      </div>

      <AnimatePresence>
        {selectedStar ? (
          <motion.button
            type="button"
            onClick={() => setSelectedStar(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 grid place-items-center bg-black/55 px-4 text-left backdrop-blur-sm"
          >
            <span className="glass block w-full max-w-sm rounded-3xl p-5">
              <span className="text-xs uppercase tracking-[0.18em] text-roseGold">{selectedStar.kind || 'Star'}</span>
              <span className="mt-2 block font-display text-3xl text-white">{selectedStar.title}</span>
              <span className="mt-2 block text-sm leading-6 text-pink-100/75">{selectedStar.note || 'A quiet star in your shared sky.'}</span>
            </span>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function SkyButton({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.08] px-2 text-xs text-pink-100 transition hover:border-blush/60 hover:bg-blush/10"
    >
      {icon}
      {label}
    </button>
  );
}
