import { motion } from 'framer-motion';
import { CalendarClock, Gift, Music2, Save, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell.jsx';
import { remainingCountdown } from '../utils/date.js';

const surpriseKey = 'ohu-surprise-v1';

const defaultSurprise = {
  title: 'A little surprise for you',
  date: import.meta.env.VITE_BIRTHDAY_DATE || '2026-12-24T00:00:00+05:30',
  message:
    'I made this small corner for the words I want you to open slowly. You are loved in the quiet, ordinary, everyday way that lasts.',
  closing: 'Thank you for existing in my life.',
  musicUrl: '',
};

function loadSurprise() {
  try {
    const raw = localStorage.getItem(surpriseKey);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? { ...defaultSurprise, ...parsed } : defaultSurprise;
  } catch {
    return defaultSurprise;
  }
}

export default function BirthdaySurprise() {
  const [surprise] = useState(() => loadSurprise());
  const [now, setNow] = useState(Date.now());
  const countdown = useMemo(() => remainingCountdown(surprise.date, now), [surprise.date, now]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <PageShell className="px-4 pb-14 pt-8 sm:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <section className="glass overflow-hidden rounded-3xl p-5 sm:p-8">
          <div className="relative min-h-[620px] overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-5 sm:p-10">
            <SoftConfetti />
            <div className="relative z-10 flex min-h-[540px] flex-col justify-center">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-roseGold">
                <Sparkles size={13} />
                A private surprise
              </p>
              <h1 className="mt-3 max-w-3xl font-display text-5xl text-white sm:text-7xl">{surprise.title || 'Untitled surprise'}</h1>
              <p className="mt-6 max-w-3xl whitespace-pre-line text-base leading-8 text-pink-100/90 sm:text-xl">
                {surprise.message || 'Your message will appear here.'}
              </p>

              <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-4">
                <CountdownCell value={countdown.days} label="Days" />
                <CountdownCell value={countdown.hours} label="Hours" />
                <CountdownCell value={countdown.minutes} label="Minutes" />
                <CountdownCell value={countdown.seconds} label="Seconds" />
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-4 py-2 text-xs text-pink-100">
                  <CalendarClock size={14} />
                  {surprise.date ? new Date(surprise.date).toLocaleString() : 'No date set'}
                </span>
                {surprise.musicUrl ? (
                  <a
                    href={surprise.musicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-roseGold/60 bg-roseGold/10 px-4 py-2 text-xs text-roseGold transition hover:bg-roseGold/20"
                  >
                    <Music2 size={14} />
                    Open music
                  </a>
                ) : null}
              </div>

              <motion.p
                initial={{ opacity: 0.7, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse' }}
                className="mt-12 font-display text-3xl text-blush sm:text-4xl"
              >
                {surprise.closing || 'Your closing line'}
              </motion.p>

              <Link to="/universe" className="mt-10 inline-flex w-fit rounded-full border border-white/15 px-5 py-2 text-sm text-pink-100 transition hover:border-blush/70">
                Back to universe
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

export function BirthdaySurpriseEditor() {
  const [surprise, setSurprise] = useState(() => loadSurprise());
  const [now, setNow] = useState(Date.now());
  const [saved, setSaved] = useState(false);
  const countdown = useMemo(() => remainingCountdown(surprise.date, now), [surprise.date, now]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  function updateField(field, value) {
    setSaved(false);
    setSurprise((previous) => ({ ...previous, [field]: value }));
  }

  function onSave(event) {
    event.preventDefault();
    localStorage.setItem(surpriseKey, JSON.stringify(surprise));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <PageShell className="px-4 pb-14 pt-8 sm:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="glass rounded-3xl p-5 sm:p-6">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-roseGold">
            <Gift size={13} />
            Surprise Editor
          </p>
          <h1 className="mt-2 font-display text-4xl text-white">Make this moment yours</h1>

          <form onSubmit={onSave} className="mt-5 space-y-4">
            <Field label="Title">
              <input
                value={surprise.title}
                onChange={(event) => updateField('title', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-blush/70"
                placeholder="Surprise title"
              />
            </Field>

            <Field label="Reveal date">
              <input
                type="datetime-local"
                value={surprise.date.slice(0, 16)}
                onChange={(event) => updateField('date', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-blush/70"
              />
            </Field>

            <Field label="Message">
              <textarea
                rows={6}
                value={surprise.message}
                onChange={(event) => updateField('message', event.target.value)}
                className="w-full resize-none rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-blush/70"
                placeholder="Write your private surprise note"
              />
            </Field>

            <Field label="Closing line">
              <input
                value={surprise.closing}
                onChange={(event) => updateField('closing', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-blush/70"
                placeholder="A final line"
              />
            </Field>

            <Field label="Music link">
              <input
                type="url"
                value={surprise.musicUrl}
                onChange={(event) => updateField('musicUrl', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-blush/70"
                placeholder="https://open.spotify.com/..."
              />
            </Field>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-5 py-2.5 text-sm font-semibold text-midnight transition hover:brightness-105"
              >
                <Save size={15} />
                Save surprise
              </button>
              <Link to="/birthday-surprise" className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-pink-100 transition hover:border-blush/70">
                View surprise
              </Link>
              <Link to="/universe" className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-pink-100 transition hover:border-blush/70">
                Back to universe
              </Link>
              {saved ? <span className="text-xs text-blush">Saved</span> : null}
            </div>
          </form>
        </section>

        <section className="glass overflow-hidden rounded-3xl p-5 sm:p-7">
          <div className="relative min-h-[560px] overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-5 sm:p-8">
            <SoftConfetti />
            <div className="relative z-10">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-roseGold">
                <Sparkles size={13} />
                Preview
              </p>
              <h2 className="mt-3 max-w-2xl font-display text-5xl text-white sm:text-6xl">{surprise.title || 'Untitled surprise'}</h2>
              <p className="mt-5 whitespace-pre-line text-base leading-7 text-pink-100/90 sm:text-lg">
                {surprise.message || 'Your message will appear here.'}
              </p>

              <div className="mt-7 grid max-w-xl gap-3 sm:grid-cols-4">
                <CountdownCell value={countdown.days} label="Days" />
                <CountdownCell value={countdown.hours} label="Hours" />
                <CountdownCell value={countdown.minutes} label="Minutes" />
                <CountdownCell value={countdown.seconds} label="Seconds" />
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-4 py-2 text-xs text-pink-100">
                  <CalendarClock size={14} />
                  {surprise.date ? new Date(surprise.date).toLocaleString() : 'No date set'}
                </span>
                {surprise.musicUrl ? (
                  <a
                    href={surprise.musicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-roseGold/60 bg-roseGold/10 px-4 py-2 text-xs text-roseGold transition hover:bg-roseGold/20"
                  >
                    <Music2 size={14} />
                    Open music
                  </a>
                ) : null}
              </div>

              <motion.p
                initial={{ opacity: 0.7, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse' }}
                className="mt-10 font-display text-3xl text-blush"
              >
                {surprise.closing || 'Your closing line'}
              </motion.p>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-pink-100/70">{label}</span>
      {children}
    </label>
  );
}

function CountdownCell({ value, label }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-center">
      <p className="font-display text-2xl text-white">{value}</p>
      <p className="text-[11px] uppercase tracking-[0.15em] text-pink-100/75">{label}</p>
    </div>
  );
}

function SoftConfetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 34 }).map((_, index) => (
        <motion.div
          key={index}
          className="absolute h-2 w-1 rounded-full"
          style={{
            left: `${(index * 17) % 100}%`,
            top: `${(index * 23) % 100}%`,
            background:
              index % 3 === 0
                ? 'rgba(255,182,200,.85)'
                : index % 3 === 1
                  ? 'rgba(216,160,127,.85)'
                  : 'rgba(255,255,255,.8)',
          }}
          animate={{ y: [0, 18, 0], rotate: [0, 180, 360], opacity: [0.2, 0.85, 0.25] }}
          transition={{ duration: 5 + (index % 5), repeat: Infinity, delay: index * 0.08 }}
        />
      ))}
    </div>
  );
}
