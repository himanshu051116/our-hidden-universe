import { motion } from 'framer-motion';
import { Gift, Music2, PartyPopper } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AmbientMusicToggle from '../components/AmbientMusicToggle.jsx';
import PageShell from '../components/PageShell.jsx';
import Typewriter from '../components/Typewriter.jsx';
import { remainingCountdown } from '../utils/date.js';

const letterText =
  'Happy birthday, my love. Thank you for being home in every season of my life, even from far away.';

export default function BirthdaySurprise() {
  const birthday = import.meta.env.VITE_BIRTHDAY_DATE || '2026-12-24T00:00:00+05:30';
  const [now, setNow] = useState(Date.now());
  const countdown = useMemo(() => remainingCountdown(birthday, now), [birthday, now]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <PageShell className="overflow-hidden px-4 pb-14 pt-12 sm:px-8">
      <Confetti />
      <Balloons />
      <div className="mx-auto w-full max-w-4xl">
        <div className="glass rounded-3xl p-6 text-center sm:p-10">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-roseGold">
            <PartyPopper size={13} />
            Secret Route
          </p>
          <h1 className="mt-2 font-display text-5xl text-white sm:text-6xl">Birthday Surprise</h1>
          <p className="mt-4 text-lg text-pink-100/90">
            <Typewriter text={letterText} speed={34} />
          </p>

          <div className="mx-auto mt-7 grid max-w-xl gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 sm:grid-cols-4">
            <CountdownCell value={countdown.days} label="Days" />
            <CountdownCell value={countdown.hours} label="Hours" />
            <CountdownCell value={countdown.minutes} label="Minutes" />
            <CountdownCell value={countdown.seconds} label="Seconds" />
          </div>

          <div className="mt-7 flex justify-center">
            <BirthdayCake />
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <AmbientMusicToggle />
            <button type="button" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs text-pink-100">
              <Music2 size={14} />
              Auto-play memory track
            </button>
          </div>

          <p className="mt-8 font-display text-3xl text-blush">Thank you for existing in my life.</p>
          <p className="mt-3 text-xs text-pink-100/70">Try keyboard secret: type LOVE or press Ctrl+Shift+H</p>

          <Link to="/universe" className="mt-7 inline-flex rounded-full border border-white/15 px-5 py-2 text-sm text-pink-100 transition hover:border-blush/70">
            Back to universe
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

function CountdownCell({ value, label }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/35 px-3 py-2">
      <p className="font-display text-2xl text-white">{value}</p>
      <p className="text-[11px] uppercase tracking-[0.15em] text-pink-100/75">{label}</p>
    </div>
  );
}

function BirthdayCake() {
  return (
    <div className="relative h-48 w-52">
      <motion.div
        className="absolute left-1/2 top-0 h-12 w-2 -translate-x-1/2 rounded-full bg-roseGold"
        animate={{ opacity: [0.6, 1, 0.65], scaleY: [0.9, 1.25, 0.9] }}
        transition={{ duration: 1.1, repeat: Infinity }}
      />
      <motion.div
        className="absolute left-1/2 top-0 h-5 w-5 -translate-x-1/2 rounded-full bg-yellow-200"
        animate={{ y: [0, -4, 0], opacity: [0.85, 1, 0.8] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      <div className="absolute bottom-0 left-1/2 h-28 w-52 -translate-x-1/2 rounded-t-[2rem] bg-gradient-to-b from-[#f7b7c8] to-[#ca6d86]" />
      <div className="absolute bottom-[98px] left-1/2 h-16 w-40 -translate-x-1/2 rounded-t-[1.4rem] bg-gradient-to-b from-[#ffe9f1] to-[#e2a3b6]" />
      <div className="absolute bottom-[8px] left-1/2 h-3 w-56 -translate-x-1/2 rounded-full bg-roseGold/40 blur-sm" />
    </div>
  );
}

function Balloons() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 12 }).map((_, index) => (
        <motion.div
          key={index}
          className="absolute h-8 w-6 rounded-full"
          style={{
            left: `${(index + 1) * 8}%`,
            top: `${60 + (index % 3) * 10}%`,
            background:
              index % 3 === 0
                ? 'rgba(255,182,200,.8)'
                : index % 3 === 1
                  ? 'rgba(216,160,127,.8)'
                  : 'rgba(162,108,204,.8)',
          }}
          animate={{ y: [0, -220], opacity: [0.8, 0] }}
          transition={{ duration: 8 + (index % 4), repeat: Infinity, delay: index * 0.5 }}
        />
      ))}
    </div>
  );
}

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 90 }).map((_, index) => (
        <motion.div
          key={index}
          className="absolute h-2 w-1 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-6%',
            background:
              index % 4 === 0
                ? 'rgba(255,182,200,.95)'
                : index % 4 === 1
                  ? 'rgba(216,160,127,.95)'
                  : index % 4 === 2
                    ? 'rgba(181,116,215,.95)'
                    : 'rgba(255,255,255,.95)',
          }}
          animate={{ y: ['0vh', '110vh'], rotate: [0, 380], opacity: [1, 0.85, 0] }}
          transition={{ duration: 5 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 4 }}
        />
      ))}
      <motion.div
        className="absolute left-1/2 top-16 h-20 w-20 -translate-x-1/2 rounded-full border border-blush/60"
        animate={{ scale: [0.3, 2.8], opacity: [0.9, 0] }}
        transition={{ duration: 2.3, repeat: Infinity }}
      />
      <motion.div
        className="absolute left-1/2 top-16 h-20 w-20 -translate-x-1/2 rounded-full border border-roseGold/60"
        animate={{ scale: [0.2, 3.6], opacity: [0.8, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, delay: 0.4 }}
      />
      <div className="sr-only">
        <Gift />
      </div>
    </div>
  );
}
