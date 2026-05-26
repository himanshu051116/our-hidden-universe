import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { hiddenNotes } from '../data/demoData.js';

export default function StarField() {
  const [note, setNote] = useState('');

  const stars = useMemo(
    () =>
      Array.from({ length: 120 }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 2.5 + 0.8,
        delay: Math.random() * 5,
        duration: 3 + Math.random() * 3,
      })),
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {stars.map((star) => (
        <motion.button
          key={star.id}
          type="button"
          onClick={() => setNote(hiddenNotes[star.id % hiddenNotes.length])}
          className="pointer-events-auto absolute rounded-full bg-white/90 shadow-[0_0_18px_rgba(255,255,255,.55)]"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
          }}
          animate={{ opacity: [0.25, 1, 0.35], scale: [1, 1.8, 1] }}
          transition={{ duration: star.duration, delay: star.delay, repeat: Infinity }}
          aria-label="Reveal hidden note"
        />
      ))}

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
