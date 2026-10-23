import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { hiddenNotes } from '../data/demoData.js';
import useLiteEffects from '../hooks/useLiteEffects.js';

export default function StarField() {
  const [note, setNote] = useState('');
  const liteEffects = useLiteEffects();
  // Ambient decoration should not contend with video playback on mobile GPUs.
  const starCount = liteEffects ? 14 : 42;

  const stars = useMemo(
    () =>
      Array.from({ length: starCount }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 2.5 + 0.8,
        delay: Math.random() * 5,
        duration: 3 + Math.random() * 3,
      })),
    [starCount],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {stars.map((star) => {
        const style = {
          left: `${star.left}%`,
          top: `${star.top}%`,
          width: `${star.size}px`,
          height: `${star.size}px`,
          animationDelay: `${star.delay}s`,
          animationDuration: `${star.duration}s`,
        };
        // One reachable easter egg rather than dozens of 2px clickable targets.
        return star.id === 0 ? (
          <button
            key={star.id}
            type="button"
            onClick={() => setNote(hiddenNotes[0])}
            className="pointer-events-auto absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-blush"
            style={{ left: `${star.left}%`, top: `${star.top}%` }}
            aria-label="Reveal a hidden note"
          >
            <span className="ambient-star h-[3px] w-[3px] rounded-full bg-white/90 shadow-[0_0_18px_rgba(255,255,255,.55)]" />
          </button>
        ) : (
          <span
            key={star.id}
            aria-hidden="true"
            className="ambient-star absolute rounded-full bg-white/90 shadow-[0_0_18px_rgba(255,255,255,.55)]"
            style={style}
          />
        );
      })}

      <AnimatePresence>
        {note && (
          <motion.button
            type="button"
            onClick={() => setNote('')}
            initial={{ opacity: 0, y: -14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            className="glass pointer-events-auto fixed left-1/2 top-5 z-50 w-[min(90vw,420px)] -translate-x-1/2 rounded-2xl px-5 py-4 text-center text-sm text-blush"
          >
            {note}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
