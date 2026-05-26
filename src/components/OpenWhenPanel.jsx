import { AnimatePresence, motion } from 'framer-motion';
import { Music2, PlayCircle, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { openWhenTemplates } from '../data/demoData.js';
import SectionTitle from './SectionTitle.jsx';

export default function OpenWhenPanel() {
  const [active, setActive] = useState(null);

  return (
    <section id="open-when" className="glass rounded-3xl p-4 sm:p-6">
      <SectionTitle
        overline="Open When"
        title="Emotional vault for hard moments"
        subtitle="Each button can carry a message, music, video, voice note, and animated surprise."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {openWhenTemplates.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item)}
            className="rounded-2xl border border-white/10 bg-black/35 px-4 py-5 text-left text-pink-100 transition hover:border-blush/60 hover:bg-black/45"
          >
            <p className="font-display text-xl text-white">{item.title}</p>
            <p className="mt-2 text-sm text-pink-100/80">Tap to open your private comfort package.</p>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {active ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4"
          >
            <motion.div
              initial={{ y: 24, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 18, scale: 0.98 }}
              className="glass relative w-full max-w-xl rounded-3xl p-6"
            >
              <button
                type="button"
                onClick={() => setActive(null)}
                className="absolute right-4 top-4 rounded-full border border-white/20 p-2 text-pink-100 transition hover:text-white"
              >
                <X size={15} />
              </button>

              <p className="text-xs uppercase tracking-[0.2em] text-roseGold">Open When</p>
              <h3 className="mt-1 font-display text-3xl text-white">{active.title}</h3>
              <p className="mt-4 text-pink-100/90">
                {active.message || 'No private note saved yet. Add this message from your backend records.'}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                  <p className="inline-flex items-center gap-2 text-sm text-blush">
                    <PlayCircle size={14} />
                    Video
                  </p>
                  <p className="mt-2 text-xs text-pink-100/80">Add a private video message in your Firestore data.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                  <p className="inline-flex items-center gap-2 text-sm text-blush">
                    <Music2 size={14} />
                    Music
                  </p>
                  <p className="mt-2 text-xs text-pink-100/80">Attach a comfort playlist or one voice note track.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/35 p-4 sm:col-span-2">
                  <p className="inline-flex items-center gap-2 text-sm text-blush">
                    <Sparkles size={14} />
                    Animated surprise
                  </p>
                  <p className="mt-2 text-xs text-pink-100/80">Confetti, glow burst, and hidden letters can be triggered here.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
