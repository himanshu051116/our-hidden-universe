import { AnimatePresence, motion } from 'framer-motion';
import {
  Bed,
  Camera,
  Heart,
  LocateFixed,
  Moon,
  Orbit,
  Plus,
  Radio,
  Send,
  Sparkles,
  Stars,
  Sun,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import useLiteEffects from '../hooks/useLiteEffects.js';
import { subscribeSharedMemories } from '../services/memoryService.js';
import {
  createSkyStar,
  sendSkySignal,
  setMoodLantern,
  setSleepState,
  subscribeNightSky,
  touchSkyStar,
  uploadRightNowPhoto,
} from '../services/nightSkyService.js';

const moods = {
  soft: { label: 'Soft', color: '#ffb6c8', glow: 'rgba(255,182,200,.52)' },
  happy: { label: 'Happy', color: '#ffd76a', glow: 'rgba(255,215,106,.50)' },
  missing: { label: 'Missing', color: '#a4dcff', glow: 'rgba(164,220,255,.52)' },
  tired: { label: 'Tired', color: '#b8a7ff', glow: 'rgba(184,167,255,.42)' },
  grateful: { label: 'Grateful', color: '#d8a07f', glow: 'rgba(216,160,127,.48)' },
};

const starKinds = {
  thought: { label: 'Thought', color: '#fff7fb', glow: 'rgba(255,247,251,.72)' },
  memory: { label: 'Memory', color: '#ffb6c8', glow: 'rgba(255,182,200,.72)' },
  dream: { label: 'Dream', color: '#b8a7ff', glow: 'rgba(184,167,255,.72)' },
  promise: { label: 'Promise', color: '#ffd76a', glow: 'rgba(255,215,106,.70)' },
  milestone: { label: 'Milestone', color: '#8ee7c4', glow: 'rgba(142,231,196,.68)' },
  'future plan': { label: 'Future plan', color: '#a4dcff', glow: 'rgba(164,220,255,.70)' },
};

const emptySky = {
  stars: [],
  signals: [],
  lanterns: {},
  sleep: {},
  photos: [],
  stats: {},
  touches: {},
};

function toDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function signalText(signal) {
  if (signal.type === 'thinking') return `${signal.senderName || 'Your partner'} is thinking about you`;
  if (signal.type === 'heartbeat') return `${signal.senderName || 'Your partner'} sent a heartbeat`;
  return `${signal.senderName || 'Your partner'} misses you`;
}

function connectedTouch(touch = {}) {
  const values = Object.entries(touch).filter(([key]) => !['starTitle', 'updatedAt'].includes(key));
  if (values.length < 2) return false;
  const times = values.map(([, value]) => toDate(value)?.getTime()).filter(Boolean).sort((a, b) => a - b);
  if (times.length < 2) return false;
  return times[times.length - 1] - times[0] < 10 * 60 * 1000;
}

function memoryMoment(memory) {
  if (!memory) return null;
  return {
    id: memory.id,
    title: memory.title || 'A memory',
    text: memory.note || 'A moment you saved together.',
    date: memory.date || '',
  };
}

export default function SharedNightSky() {
  const { user, coupleId } = useAuth();
  const liteEffects = useLiteEffects();
  const [sky, setSky] = useState(emptySky);
  const [sharedMemories, setSharedMemories] = useState([]);
  const [selectedStar, setSelectedStar] = useState(null);
  const [starFormOpen, setStarFormOpen] = useState(false);
  const [starForm, setStarForm] = useState({ title: '', note: '', kind: 'thought' });
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [memoryIndex, setMemoryIndex] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const dragRef = useRef({ x: 0, y: 0, pan });
  const dragFrameRef = useRef(0);
  const noticeTimerRef = useRef(null);

  const backgroundStars = useMemo(
    () =>
      Array.from({ length: liteEffects ? 18 : 42 }, (_, index) => ({
        id: index,
        left: (index * 19) % 100,
        top: (index * 31) % 96,
        duration: 2.8 + (index % 6),
        delay: index * 0.05,
      })),
    [liteEffects],
  );

  const currentMemory = memoryMoment(sharedMemories[memoryIndex % Math.max(1, sharedMemories.length)]);
  const lanterns = Object.values(sky.lanterns || {});
  const sleepStates = Object.values(sky.sleep || {});
  const sleeping = sleepStates.some((state) => state.asleep);
  const missYou = Number(sky.stats?.missYou || 0);
  const energy = Math.min(100, missYou * 12);
  const freshPartnerSignal = (sky.signals || []).find((signal) => {
    if (signal.senderId && signal.senderId === user?.uid) return false;
    const createdAt = toDate(signal.createdAt)?.getTime();
    return createdAt && clock - createdAt <= 2 * 60 * 1000;
  });

  const showNotice = useCallback((text, duration = 2400) => {
    setNotice(text);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(''), duration);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeNightSky(
      coupleId,
      setSky,
      () => showNotice('Night Sky could not sync. Check your connection and try again.', 3600),
    );
    return unsubscribe;
  }, [coupleId, showNotice]);

  useEffect(() => {
    const unsubscribe = subscribeSharedMemories(
      coupleId,
      setSharedMemories,
      () => showNotice('Your shared memories could not be refreshed right now.', 3200),
    );
    return unsubscribe;
  }, [coupleId, showNotice]);

  useEffect(() => {
    if (!sharedMemories.length) return undefined;
    const timer = window.setInterval(() => setMemoryIndex((index) => index + 1), 12000);
    return () => window.clearInterval(timer);
  }, [sharedMemories.length]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(noticeTimerRef.current);
      window.cancelAnimationFrame(dragFrameRef.current);
    },
    [],
  );

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setDragging(false);
  }

  function onPointerDown(event) {
    if (event.target.closest('button, input, textarea, select, a')) return;
    setDragging(true);
    dragRef.current = { x: event.clientX, y: event.clientY, pan };
  }

  function onPointerMove(event) {
    if (!dragging) return;
    const clientX = event.clientX;
    const clientY = event.clientY;
    window.cancelAnimationFrame(dragFrameRef.current);
    dragFrameRef.current = window.requestAnimationFrame(() => {
      setPan({
        x: dragRef.current.pan.x + clientX - dragRef.current.x,
        y: dragRef.current.pan.y + clientY - dragRef.current.y,
      });
    });
  }

  function onPointerUp() {
    setDragging(false);
  }

  async function onAddStar(event) {
    event.preventDefault();
    if (!starForm.title.trim()) return;
    try {
      await createSkyStar(coupleId, user, {
        ...starForm,
        title: starForm.title.trim().slice(0, 120),
        note: starForm.note.trim().slice(0, 2000),
      });
      setStarForm({ title: '', note: '', kind: 'thought' });
      setStarFormOpen(false);
      showNotice('Star placed in your sky.');
    } catch (error) {
      showNotice(error.message || 'Unable to place this star right now.');
    }
  }

  async function onSignal(type) {
    try {
      await sendSkySignal(coupleId, user, type);
      showNotice(
        type === 'thinking'
          ? 'A thought crossed the universe.'
          : type === 'heartbeat'
            ? 'Heartbeat sent.'
            : 'Miss-you signal sent.',
        1800,
      );
    } catch (error) {
      showNotice(error.message || 'Unable to send this signal right now.');
    }
  }

  async function onTouchStar(star) {
    setSelectedStar(star);
    try {
      await touchSkyStar(coupleId, user, star);
    } catch (error) {
      showNotice(error.message || 'Unable to touch this star right now.');
    }
  }

  async function onMood(mood) {
    try {
      await setMoodLantern(coupleId, user, mood);
      showNotice('Mood lantern updated.', 1800);
    } catch (error) {
      showNotice(error.message || 'Unable to update your mood lantern.');
    }
  }

  async function onSleep(asleep) {
    try {
      await setSleepState(coupleId, user, asleep);
      showNotice(asleep ? 'Goodnight mode is on.' : 'Good morning mode is on.', 1800);
    } catch (error) {
      showNotice(error.message || 'Unable to update sleep mode.');
    }
  }

  async function onPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    try {
      await uploadRightNowPhoto(coupleId, user, file, photoCaption.trim().slice(0, 240));
      setPhotoCaption('');
      showNotice('Photo shared to the sky.', 1800);
    } catch (error) {
      showNotice(error.message || 'Unable to share this photo.');
    } finally {
      setPhotoBusy(false);
      event.target.value = '';
    }
  }

  return (
    <section className="space-y-4 sm:space-y-5">
      <div className="glass overflow-hidden rounded-2xl sm:rounded-3xl">
        <div className={`relative min-h-[650px] overflow-hidden bg-[#030510] transition duration-700 sm:min-h-[720px] ${sleeping ? 'brightness-75 saturate-75' : ''}`}>
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 52%, rgba(255,182,200,${0.08 + energy / 900}), transparent 34rem), radial-gradient(circle at 80% 20%, rgba(164,220,255,.14), transparent 26rem), linear-gradient(135deg,#030510,#130817 55%,#05040a)`,
            }}
          />

          <div className="pointer-events-none absolute inset-0 opacity-70">
            {backgroundStars.map((star) => (
              <span
                key={star.id}
                className="sky-spark absolute h-1 w-1 rounded-full bg-white"
                style={{
                  left: `${star.left}%`,
                  top: `${star.top}%`,
                  animationDelay: `${star.delay}s`,
                  animationDuration: `${star.duration}s`,
                }}
              />
            ))}
          </div>

          <div className="absolute inset-x-0 top-0 z-20 flex flex-col gap-3 p-3 sm:flex-row sm:items-start sm:justify-between sm:p-5">
            <div className="max-w-xl rounded-2xl bg-black/25 p-3 backdrop-blur-md sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
              <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-roseGold sm:text-xs sm:tracking-[0.2em]">
                <Stars size={14} /> Shared Night Sky
              </p>
              <h2 className="mt-2 font-display text-[2.1rem] leading-[1.04] text-white sm:text-5xl">Your universe, alive together.</h2>
              <p className="mt-2 max-w-lg text-xs leading-5 text-pink-100/68 sm:text-sm sm:leading-6">
                Place thoughts in the sky, touch the same star, send a pulse, and leave ordinary moments glowing for each other.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 rounded-full bg-black/25 p-1.5 backdrop-blur-sm sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
              <IconButton label="Zoom in" onClick={() => setZoom((value) => Math.min(1.6, value + 0.12))} icon={<ZoomIn size={16} />} />
              <IconButton label="Zoom out" onClick={() => setZoom((value) => Math.max(0.72, value - 0.12))} icon={<ZoomOut size={16} />} />
              <IconButton label="Recenter sky" onClick={resetView} icon={<LocateFixed size={16} />} />
              <button
                type="button"
                onClick={() => setStarFormOpen(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-4 text-sm font-semibold text-midnight"
              >
                <Plus size={16} /> Star
              </button>
            </div>
          </div>

          <div
            className={`absolute inset-0 cursor-grab touch-none ${dragging ? 'cursor-grabbing' : ''}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center' }}
          >
            <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-65">
              {(sky.stars || []).slice(1).map((star, index) => {
                const previous = sky.stars[index];
                if (!previous) return null;
                return (
                  <line
                    key={`${star.id}-${previous.id}`}
                    x1={`${previous.x}%`}
                    y1={`${previous.y}%`}
                    x2={`${star.x}%`}
                    y2={`${star.y}%`}
                    stroke="rgba(255,182,200,.22)"
                    strokeWidth="1"
                    strokeDasharray="4 8"
                  />
                );
              })}
            </svg>

            {(sky.stars || []).map((star) => {
              const connected = connectedTouch(sky.touches?.[star.id]);
              const kind = starKinds[star.kind] || starKinds.thought;
              return (
                <button
                  key={star.id}
                  type="button"
                  onClick={() => onTouchStar(star)}
                  className="group pointer-events-auto absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full outline-none"
                  style={{ left: `${star.x}%`, top: `${star.y}%` }}
                  aria-label={`Open ${kind.label.toLowerCase()} star ${star.title}`}
                >
                  <motion.span
                    className={`absolute rounded-full border ${connected ? 'h-20 w-20 border-blush/55' : 'h-11 w-11 border-white/10'}`}
                    style={{ background: connected ? 'rgba(255,182,200,.12)' : `${kind.color}10`, boxShadow: `0 0 ${connected ? 42 : 24}px ${kind.glow}` }}
                    animate={liteEffects ? false : { scale: connected ? [1, 1.16, 1] : [1, 1.08, 1], opacity: connected ? [0.46, 0.95, 0.46] : [0.28, 0.66, 0.28] }}
                    transition={{ duration: connected ? 2.1 : 3.4, repeat: Infinity }}
                  />
                  <span className="relative h-3.5 w-3.5 rounded-full" style={{ background: connected ? '#ffb6c8' : kind.color, boxShadow: `0 0 24px ${connected ? 'rgba(255,182,200,.95)' : kind.glow}` }} />
                  <span className="pointer-events-none absolute top-5 hidden min-w-36 rounded-xl border border-white/10 bg-black/75 px-3 py-2 text-left text-xs text-pink-100 group-hover:block">
                    <span className="block text-[10px] uppercase tracking-[0.14em] text-roseGold">{kind.label}</span>
                    <span className="mt-1 block text-white">{star.title}</span>
                  </span>
                </button>
              );
            })}

            {lanterns.map((lantern, index) => {
              const mood = moods[lantern.mood] || moods.soft;
              return (
                <motion.div
                  key={lantern.id || lantern.userId}
                  className="pointer-events-none absolute"
                  style={{ left: `${16 + index * 18}%`, top: `${64 + (index % 2) * 10}%` }}
                  animate={liteEffects ? false : { y: [0, -18, 0], x: [0, 8, 0] }}
                  transition={{ duration: 6 + index, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="h-14 w-10 rounded-full border border-white/15" style={{ background: mood.glow, boxShadow: `0 0 36px ${mood.glow}` }} />
                  <p className="mt-2 rounded-full bg-black/45 px-2 py-1 text-center text-[10px] text-pink-100">{mood.label}</p>
                </motion.div>
              );
            })}
          </div>

          <div className="pointer-events-none absolute bottom-20 left-3 z-20 hidden max-w-[70%] flex-wrap gap-x-3 gap-y-1 rounded-full border border-white/8 bg-black/35 px-3 py-2 backdrop-blur sm:flex">
            {Object.values(starKinds).map((kind) => (
              <span key={kind.label} className="inline-flex items-center gap-1.5 text-[10px] text-pink-100/55">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: kind.color, boxShadow: `0 0 8px ${kind.glow}` }} />
                {kind.label}
              </span>
            ))}
          </div>

          <div className="absolute inset-x-3 bottom-3 z-30 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/48 p-2 shadow-2xl backdrop-blur-xl sm:left-1/2 sm:right-auto sm:w-auto sm:-translate-x-1/2 sm:grid-cols-none sm:grid-flow-col sm:rounded-full">
            <SignalButton icon={<Sparkles size={15} />} label="Thinking" onClick={() => onSignal('thinking')} />
            <SignalButton icon={<Radio size={15} />} label="Heartbeat" onClick={() => onSignal('heartbeat')} />
            <SignalButton icon={<Heart size={15} />} label="Miss you" onClick={() => onSignal('missYou')} />
          </div>

          <AnimatePresence>
            {freshPartnerSignal ? (
              <motion.div
                key={freshPartnerSignal.id || freshPartnerSignal.createdAt}
                className="pointer-events-none absolute left-3 right-3 top-48 z-30 rounded-2xl border border-blush/30 bg-blush/12 p-3 text-xs text-pink-50 backdrop-blur-xl sm:left-auto sm:right-5 sm:top-40 sm:w-80 sm:rounded-3xl sm:p-4 sm:text-sm"
                initial={{ opacity: 0, x: -50, y: 16 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55 }}
              >
                <p className="inline-flex items-center gap-2"><Sparkles size={15} className="text-blush" />{signalText(freshPartnerSignal)}</p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {sleeping ? <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_20%,rgba(184,167,255,.16),transparent_28rem)]" /> : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
        <section className="glass rounded-2xl p-4 sm:rounded-3xl sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="inline-flex items-center gap-2 text-sm text-roseGold"><Moon size={15} />Shared rituals</p>
            <p className="text-xs text-pink-100/45">Small signals both of you can see.</p>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-roseGold">Mood lantern</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {Object.entries(moods).map(([key, mood]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onMood(key)}
                    className="min-h-10 rounded-full border border-white/10 px-3 py-2 text-xs text-pink-100 transition hover:border-blush/70"
                    style={{ boxShadow: `0 0 16px ${mood.glow}` }}
                  >
                    {mood.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-roseGold">Sleep together</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <ActionButton icon={<Bed size={15} />} label="Goodnight" onClick={() => onSleep(true)} />
                <ActionButton icon={<Sun size={15} />} label="Good morning" onClick={() => onSleep(false)} />
              </div>
              <p className="mt-3 text-xs text-pink-100/58">{sleeping ? 'The universe is resting with you.' : 'The universe is awake and glowing.'}</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Thoughts" value={sky.stats?.thoughts || 0} />
            <Stat label="Heartbeats" value={sky.stats?.heartbeats || 0} />
            <Stat label="Miss you" value={missYou} />
            <Stat label="Sleep rituals" value={sky.stats?.sleepRituals || 0} />
          </div>
        </section>

        <section className="glass rounded-2xl p-4 sm:rounded-3xl sm:p-5">
          <p className="inline-flex items-center gap-2 text-sm text-roseGold"><Orbit size={15} />Memory orbit</p>
          <p className="mt-1 text-xs text-pink-100/45">Resurfaced only from the memories you actually share together.</p>

          {currentMemory ? (
            <motion.article key={currentMemory.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-roseGold">From shared memories</p>
              <h3 className="mt-2 font-display text-3xl text-white">{currentMemory.title}</h3>
              <p className="mt-3 text-sm leading-6 text-pink-100/75">{currentMemory.text}</p>
              {currentMemory.date ? <p className="mt-4 text-xs text-pink-100/38">{currentMemory.date}</p> : null}
            </motion.article>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-white/12 bg-black/25 px-5 py-8 text-center">
              <p className="font-display text-2xl text-white">Your memory orbit is waiting.</p>
              <p className="mt-2 text-sm text-pink-100/55">Add a shared memory and the sky will quietly bring it back later.</p>
            </div>
          )}

          <div className="mt-4">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-pink-100/42"><span>Sky glow</span><span>{energy}%</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8"><motion.div className="h-full rounded-full bg-gradient-to-r from-blush to-roseGold" animate={{ width: `${energy}%` }} /></div>
          </div>
        </section>
      </div>

      <section className="glass rounded-2xl p-4 sm:rounded-3xl sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm text-roseGold"><Camera size={15} />Right now</p>
            <p className="mt-1 text-xs text-pink-100/45">Ordinary moments disappear quickly. Keep a few glowing here.</p>
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <input
              value={photoCaption}
              maxLength={240}
              onChange={(event) => setPhotoCaption(event.target.value)}
              placeholder="Tiny caption"
              className="min-h-11 w-full rounded-full border border-white/10 bg-black/35 px-4 py-2 text-xs text-white outline-none focus:border-blush/70 sm:w-52"
            />
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-4 py-2 text-xs font-semibold text-midnight">
              <Camera size={14} />{photoBusy ? 'Sharing…' : 'Share now'}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} disabled={photoBusy} />
            </label>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(sky.photos || []).length ? sky.photos.map((photo) => (
            <article key={photo.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <img src={photo.photoUrl} alt={photo.caption || 'Right now'} className="h-44 w-full object-cover" loading="lazy" />
              <div className="p-3">
                <p className="text-sm text-white">{photo.caption || 'Right now'}</p>
                <p className="mt-1 text-[11px] text-pink-100/50">{photo.senderName || 'You'}</p>
              </div>
            </article>
          )) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-black/25 px-4 py-8 text-center text-sm text-pink-100/65 sm:col-span-2 lg:col-span-4">Share an ordinary moment from right now.</div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {starFormOpen ? (
          <motion.div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 px-4 py-[calc(1rem+env(safe-area-inset-top))] backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.form onSubmit={onAddStar} className="glass w-full max-w-lg rounded-2xl p-4 sm:rounded-3xl sm:p-5" initial={{ y: 18, scale: 0.98 }} animate={{ y: 0, scale: 1 }}>
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-roseGold"><Stars size={14} />Create a star</p>
              <input
                value={starForm.title}
                maxLength={120}
                onChange={(event) => setStarForm((previous) => ({ ...previous, title: event.target.value }))}
                placeholder="A thought, promise, dream..."
                className="mt-4 min-h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-blush/70"
                required
              />
              <select
                value={starForm.kind}
                onChange={(event) => setStarForm((previous) => ({ ...previous, kind: event.target.value }))}
                className="mt-3 min-h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none"
              >
                {Object.entries(starKinds).map(([key, kind]) => <option key={key} value={key}>{kind.label}</option>)}
              </select>
              <textarea
                value={starForm.note}
                maxLength={2000}
                onChange={(event) => setStarForm((previous) => ({ ...previous, note: event.target.value }))}
                placeholder="What does this star mean?"
                rows={4}
                className="mt-3 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-blush/70"
              />
              <div className="mt-4 grid gap-2 sm:flex sm:justify-end">
                <button type="button" onClick={() => setStarFormOpen(false)} className="min-h-11 rounded-full border border-white/15 px-4 py-2 text-sm text-pink-100">Cancel</button>
                <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-5 py-2 text-sm font-semibold text-midnight"><Send size={14} />Place star</button>
              </div>
            </motion.form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {selectedStar ? (
          <motion.div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 px-4 py-[calc(1rem+env(safe-area-inset-top))] backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedStar(null)}>
            <motion.article className="glass w-full max-w-md rounded-2xl p-4 sm:rounded-3xl sm:p-5" initial={{ y: 18 }} animate={{ y: 0 }} onClick={(event) => event.stopPropagation()}>
              <p className="text-xs uppercase tracking-[0.18em] text-roseGold">{(starKinds[selectedStar.kind] || starKinds.thought).label}</p>
              <h3 className="mt-2 font-display text-3xl text-white">{selectedStar.title}</h3>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-pink-100/80">{selectedStar.note || 'A quiet star in your shared universe.'}</p>
              {connectedTouch(sky.touches?.[selectedStar.id]) ? <p className="mt-4 rounded-2xl border border-blush/20 bg-blush/10 px-3 py-2 text-xs text-blush">You both touched this star close together.</p> : null}
              <button type="button" onClick={() => setSelectedStar(null)} className="mt-5 min-h-11 rounded-full border border-white/15 px-4 py-2 text-sm text-pink-100">Close</button>
            </motion.article>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {notice ? <p className="fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 rounded-full border border-blush/40 bg-midnight/95 px-4 py-2 text-center text-sm text-blush">{notice}</p> : null}
    </section>
  );
}

function IconButton({ icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-black/30 text-pink-100 transition hover:border-blush/70" aria-label={label}>
      {icon}
    </button>
  );
}

function SignalButton({ icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-[11px] text-pink-50 transition hover:bg-blush/10 sm:rounded-full sm:px-4 sm:text-xs">
      {icon}<span>{label}</span>
    </button>
  );
}

function ActionButton({ icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-xs text-pink-100 transition hover:border-blush/70 hover:bg-blush/10">
      {icon}{label}
    </button>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-roseGold">{label}</p>
      <p className="mt-1 font-display text-2xl text-white">{value}</p>
    </div>
  );
}
