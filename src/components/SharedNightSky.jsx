import { AnimatePresence, motion } from 'framer-motion';
import {
  Bed,
  Camera,
  Heart,
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
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
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
  happy: { label: 'Happy', color: '#ffd76a', glow: 'rgba(255,215,106,.5)' },
  missing: { label: 'Missing', color: '#a4dcff', glow: 'rgba(164,220,255,.52)' },
  tired: { label: 'Tired', color: '#b8a7ff', glow: 'rgba(184,167,255,.42)' },
  grateful: { label: 'Grateful', color: '#d8a07f', glow: 'rgba(216,160,127,.48)' },
};

const starKinds = ['thought', 'memory', 'dream', 'promise', 'milestone', 'future plan'];

function toDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function signalText(signal) {
  if (signal.type === 'thinking') return `${signal.senderName || 'Someone'} is thinking about you`;
  if (signal.type === 'heartbeat') return `${signal.senderName || 'Someone'} sent a heartbeat`;
  return `${signal.senderName || 'Someone'} misses you`;
}

function connectedTouch(touch = {}) {
  const values = Object.entries(touch).filter(([key]) => !['starTitle', 'updatedAt'].includes(key));
  if (values.length < 2) return false;
  const times = values.map(([, value]) => toDate(value)?.getTime()).filter(Boolean).sort((a, b) => a - b);
  if (times.length < 2) return false;
  return times[times.length - 1] - times[0] < 10 * 60 * 1000;
}

function loadMemories() {
  try {
    const memories = JSON.parse(localStorage.getItem('ohu-memories-v1') || '[]');
    const messages = JSON.parse(localStorage.getItem('ohu-demo-messages-v1') || '[]');
    return [
      ...memories.map((item) => ({
        id: `memory-${item.id}`,
        title: item.title || 'A memory',
        text: item.note || 'A shared moment from your timeline.',
        date: item.date,
      })),
      ...messages.slice(-6).map((item) => ({
        id: `message-${item.id}`,
        title: 'A message from before',
        text: item.text || item.caption || 'A private shared moment.',
        date: item.createdAt,
      })),
    ];
  } catch {
    return [];
  }
}

export default function SharedNightSky() {
  const { user, coupleId } = useAuth();
  const [sky, setSky] = useState({ stars: [], signals: [], lanterns: {}, sleep: {}, photos: [], stats: {}, touches: {} });
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
  const dragRef = useRef({ x: 0, y: 0, pan });

  const memories = useMemo(() => loadMemories(), []);
  const currentMemory = memories[memoryIndex % Math.max(1, memories.length)];
  const lanterns = Object.values(sky.lanterns || {});
  const sleepStates = Object.values(sky.sleep || {});
  const sleeping = sleepStates.some((state) => state.asleep);
  const missYou = sky.stats?.missYou || 0;
  const energy = Math.min(100, missYou * 12);
  const latestSignal = sky.signals?.[0];

  useEffect(() => subscribeNightSky(coupleId, setSky), [coupleId]);

  useEffect(() => {
    if (!memories.length) return undefined;
    const timer = window.setInterval(() => setMemoryIndex((index) => index + 1), 12000);
    return () => window.clearInterval(timer);
  }, [memories.length]);

  function onPointerDown(event) {
    if (event.target.closest('button, input, textarea, select, a')) return;
    setDragging(true);
    dragRef.current = { x: event.clientX, y: event.clientY, pan };
  }

  function onPointerMove(event) {
    if (!dragging) return;
    setPan({
      x: dragRef.current.pan.x + event.clientX - dragRef.current.x,
      y: dragRef.current.pan.y + event.clientY - dragRef.current.y,
    });
  }

  function onPointerUp() {
    setDragging(false);
  }

  async function onAddStar(event) {
    event.preventDefault();
    if (!starForm.title.trim()) return;
    await createSkyStar(coupleId, user, {
      ...starForm,
      title: starForm.title.trim(),
      note: starForm.note.trim(),
    });
    setStarForm({ title: '', note: '', kind: 'thought' });
    setStarFormOpen(false);
  }

  async function onSignal(type) {
    await sendSkySignal(coupleId, user, type);
    setNotice(type === 'thinking' ? 'A thought crossed the universe.' : type === 'heartbeat' ? 'Heartbeat sent.' : 'Miss-you energy added.');
    window.setTimeout(() => setNotice(''), 1800);
  }

  async function onTouchStar(star) {
    setSelectedStar(star);
    await touchSkyStar(coupleId, user, star);
  }

  async function onPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    try {
      await uploadRightNowPhoto(coupleId, user, file, photoCaption);
      setPhotoCaption('');
    } catch (error) {
      setNotice(error.message || 'Unable to share this photo.');
      window.setTimeout(() => setNotice(''), 2400);
    } finally {
      setPhotoBusy(false);
      event.target.value = '';
    }
  }

  return (
    <section className="space-y-4 sm:space-y-5">
      <div className="glass overflow-hidden rounded-2xl sm:rounded-3xl">
        <div className={`relative min-h-[640px] overflow-hidden bg-[#030510] transition duration-700 sm:min-h-[720px] ${sleeping ? 'brightness-75 saturate-75' : ''}`}>
          <div
            className="absolute inset-0"
            style={{
              background:
                `radial-gradient(circle at 50% 50%, rgba(255,182,200,${0.08 + energy / 900}), transparent 34rem), radial-gradient(circle at 80% 20%, rgba(164,220,255,.14), transparent 26rem), linear-gradient(135deg,#030510,#130817 55%,#05040a)`,
            }}
          />
          <div className="pointer-events-none absolute inset-0 opacity-70">
            {Array.from({ length: 44 }).map((_, index) => (
              <motion.span
                key={index}
                className="absolute h-1 w-1 rounded-full bg-white"
                style={{ left: `${(index * 19) % 100}%`, top: `${(index * 31) % 96}%` }}
                animate={{ opacity: [0.18, 0.9, 0.18], scale: [1, 1.8, 1] }}
                transition={{ duration: 2.8 + (index % 6), repeat: Infinity, delay: index * 0.05 }}
              />
            ))}
          </div>

          <div className="absolute inset-x-0 top-0 z-20 flex flex-col gap-3 p-3 sm:flex-row sm:items-start sm:justify-between sm:p-5">
            <div className="max-w-2xl rounded-2xl bg-black/20 p-3 backdrop-blur-sm sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
              <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-roseGold sm:text-xs sm:tracking-[0.2em]">
                <Stars size={14} />
                Shared Night Sky
              </p>
              <h2 className="mt-2 font-display text-[2.1rem] leading-[1.05] text-white sm:text-5xl">A living universe for your relationship</h2>
              <p className="mt-2 max-w-xl text-xs leading-5 text-pink-100/75 sm:text-sm sm:leading-6">
                Add stars, send pulses, float moods, share right-now photos, and revisit memories together in real time.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 rounded-full bg-black/25 p-1.5 backdrop-blur-sm sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
              <IconButton label="Zoom in" onClick={() => setZoom((value) => Math.min(1.6, value + 0.12))} icon={<ZoomIn size={16} />} />
              <IconButton label="Zoom out" onClick={() => setZoom((value) => Math.max(0.72, value - 0.12))} icon={<ZoomOut size={16} />} />
              <button
                type="button"
                onClick={() => setStarFormOpen(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-4 text-sm font-semibold text-midnight"
              >
                <Plus size={16} />
                Star
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
            <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-70">
              {sky.stars?.slice(1).map((star, index) => {
                const previous = sky.stars[index];
                if (!previous) return null;
                return (
                  <line
                    key={`${star.id}-${previous.id}`}
                    x1={`${previous.x}%`}
                    y1={`${previous.y}%`}
                    x2={`${star.x}%`}
                    y2={`${star.y}%`}
                    stroke="rgba(255,182,200,.24)"
                    strokeWidth="1"
                    strokeDasharray="4 8"
                  />
                );
              })}
            </svg>

            {sky.stars?.map((star) => {
              const connected = connectedTouch(sky.touches?.[star.id]);
              return (
                <button
                  key={star.id}
                  type="button"
                  onClick={() => onTouchStar(star)}
                  className="group pointer-events-auto absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full outline-none"
                  style={{ left: `${star.x}%`, top: `${star.y}%` }}
                  aria-label={`Open star ${star.title}`}
                >
                  <motion.span
                    className={`absolute rounded-full ${connected ? 'h-20 w-20 border border-blush/50 bg-blush/10' : 'h-10 w-10 bg-white/5'}`}
                    animate={{ scale: connected ? [1, 1.16, 1] : [1, 1.08, 1], opacity: connected ? [0.4, 0.9, 0.4] : [0.25, 0.65, 0.25] }}
                    transition={{ duration: connected ? 2.1 : 3.4, repeat: Infinity }}
                  />
                  <span className={`relative h-3.5 w-3.5 rounded-full ${connected ? 'bg-blush' : 'bg-white'} shadow-[0_0_22px_rgba(255,255,255,.9)]`} />
                  <span className="pointer-events-none absolute top-5 hidden min-w-36 rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-left text-xs text-pink-100 group-hover:block">
                    {star.title}
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
                  animate={{ y: [0, -18, 0], x: [0, 8, 0] }}
                  transition={{ duration: 6 + index, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="h-14 w-10 rounded-full border border-white/15" style={{ background: mood.glow, boxShadow: `0 0 36px ${mood.glow}` }} />
                  <p className="mt-2 rounded-full bg-black/40 px-2 py-1 text-center text-[10px] text-pink-100">{mood.label}</p>
                </motion.div>
              );
            })}
          </div>

          <AnimatePresence>
            {latestSignal ? (
              <motion.div
                key={latestSignal.id || latestSignal.createdAt}
                className="pointer-events-none absolute left-3 right-3 top-48 z-30 rounded-2xl border border-blush/30 bg-blush/12 p-3 text-xs text-pink-50 backdrop-blur-xl sm:left-auto sm:right-5 sm:top-40 sm:w-80 sm:rounded-3xl sm:p-4 sm:text-sm"
                initial={{ opacity: 0, x: -80, y: 20 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
              >
                <p className="inline-flex items-center gap-2">
                  <Sparkles size={15} className="text-blush" />
                  {signalText(latestSignal)}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {sleeping ? (
            <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_20%,rgba(184,167,255,.16),transparent_28rem)]" />
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
        <section className="glass rounded-2xl p-4 sm:rounded-3xl sm:p-5">
          <p className="inline-flex items-center gap-2 text-sm text-roseGold">
            <Heart size={15} />
            Presence Signals
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
            <ActionButton icon={<Sparkles size={16} />} label="Thinking About You" onClick={() => onSignal('thinking')} />
            <ActionButton icon={<Radio size={16} />} label="Send Heartbeat" onClick={() => onSignal('heartbeat')} />
            <ActionButton icon={<Heart size={16} />} label="I Miss You" onClick={() => onSignal('missYou')} />
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-roseGold">
              <span>Miss You Meter</span>
              <span>{energy}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-blush to-roseGold" animate={{ width: `${energy}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-pink-100/70">
              Milestones brighten the sky and increase glow, particles, and emotional atmosphere.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <Stat label="Thoughts" value={sky.stats?.thoughts || 0} />
            <Stat label="Heartbeats" value={sky.stats?.heartbeats || 0} />
            <Stat label="Miss you" value={missYou} />
            <Stat label="Sleep rituals" value={sky.stats?.sleepRituals || 0} />
          </div>
        </section>

        <section className="glass rounded-2xl p-4 sm:rounded-3xl sm:p-5">
          <p className="inline-flex items-center gap-2 text-sm text-roseGold">
            <Moon size={15} />
            Mood, Sleep, Memory
          </p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-roseGold">Shared Mood Lantern</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {Object.entries(moods).map(([key, mood]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMoodLantern(coupleId, user, key)}
                    className="min-h-10 rounded-full border border-white/10 px-3 py-2 text-xs text-pink-100 transition hover:border-blush/70"
                    style={{ boxShadow: `0 0 18px ${mood.glow}` }}
                  >
                    {mood.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-roseGold">Sleep Together Mode</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <ActionButton icon={<Bed size={15} />} label="Goodnight" onClick={() => setSleepState(coupleId, user, true)} />
                <ActionButton icon={<Sun size={15} />} label="Good morning" onClick={() => setSleepState(coupleId, user, false)} />
              </div>
              <p className="mt-3 text-xs text-pink-100/65">{sleeping ? 'The universe is resting with you.' : 'The universe is awake and glowing.'}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 p-4">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-roseGold">
              <Orbit size={14} />
              Random Memory Moment
            </p>
            {currentMemory ? (
              <motion.div key={currentMemory.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
                <h3 className="font-display text-2xl text-white">{currentMemory.title}</h3>
                <p className="mt-2 text-sm leading-6 text-pink-100/80">{currentMemory.text}</p>
              </motion.div>
            ) : (
              <p className="mt-3 text-sm text-pink-100/70">Add messages or memories and the sky will resurface them here.</p>
            )}
          </div>
        </section>
      </div>

      <section className="glass rounded-2xl p-4 sm:rounded-3xl sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="inline-flex items-center gap-2 text-sm text-roseGold">
            <Camera size={15} />
            Right Now Photos
          </p>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <input
              value={photoCaption}
              onChange={(event) => setPhotoCaption(event.target.value)}
              placeholder="Tiny caption"
              className="min-h-11 w-full rounded-full border border-white/10 bg-black/35 px-4 py-2 text-xs text-white outline-none focus:border-blush/70 sm:w-auto"
            />
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-4 py-2 text-xs font-semibold text-midnight">
              <Camera size={14} />
              {photoBusy ? 'Sharing...' : 'Share now'}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} disabled={photoBusy} />
            </label>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sky.photos?.length ? sky.photos.map((photo) => (
            <article key={photo.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black/35">
              <img src={photo.photoUrl} alt={photo.caption || 'Right now'} className="h-44 w-full object-cover" />
              <div className="p-3">
                <p className="text-sm text-white">{photo.caption || 'Right now'}</p>
                <p className="mt-1 text-[11px] text-pink-100/55">{photo.senderName || 'You'}</p>
              </div>
            </article>
          )) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-black/35 px-4 py-8 text-center text-sm text-pink-100/70 sm:col-span-2 lg:col-span-4">
              Share an ordinary moment from right now.
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {starFormOpen ? (
          <motion.div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 px-4 py-[calc(1rem+env(safe-area-inset-top))] backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.form onSubmit={onAddStar} className="glass w-full max-w-lg rounded-2xl p-4 sm:rounded-3xl sm:p-5" initial={{ y: 18, scale: 0.98 }} animate={{ y: 0, scale: 1 }}>
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-roseGold">
                <Stars size={14} />
                Create a star
              </p>
              <input
                value={starForm.title}
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
                {starKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
              </select>
              <textarea
                value={starForm.note}
                onChange={(event) => setStarForm((previous) => ({ ...previous, note: event.target.value }))}
                placeholder="What does this star mean?"
                rows={4}
                className="mt-3 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-blush/70"
              />
              <div className="mt-4 grid gap-2 sm:flex sm:justify-end">
                <button type="button" onClick={() => setStarFormOpen(false)} className="min-h-11 rounded-full border border-white/15 px-4 py-2 text-sm text-pink-100">Cancel</button>
                <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-5 py-2 text-sm font-semibold text-midnight">
                  <Send size={14} />
                  Place star
                </button>
              </div>
            </motion.form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {selectedStar ? (
          <motion.div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 px-4 py-[calc(1rem+env(safe-area-inset-top))] backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedStar(null)}>
            <motion.article className="glass w-full max-w-md rounded-2xl p-4 sm:rounded-3xl sm:p-5" initial={{ y: 18 }} animate={{ y: 0 }} onClick={(event) => event.stopPropagation()}>
              <p className="text-xs uppercase tracking-[0.18em] text-roseGold">{selectedStar.kind || 'Star'}</p>
              <h3 className="mt-2 font-display text-3xl text-white">{selectedStar.title}</h3>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-pink-100/80">{selectedStar.note || 'A quiet star in your shared universe.'}</p>
              <button type="button" onClick={() => setSelectedStar(null)} className="mt-5 rounded-full border border-white/15 px-4 py-2 text-sm text-pink-100">Close</button>
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

function ActionButton({ icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-xs text-pink-100 transition hover:border-blush/70 hover:bg-blush/10 sm:w-auto">
      {icon}
      {label}
    </button>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-roseGold">{label}</p>
      <p className="mt-1 font-display text-2xl text-white">{value}</p>
    </div>
  );
}
