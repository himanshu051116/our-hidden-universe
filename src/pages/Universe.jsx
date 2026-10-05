import { motion } from 'framer-motion';
import { Heart, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from '../components/navigation/BottomNav.jsx';
import PageShell from '../components/PageShell.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useEasterEggs from '../hooks/useEasterEggs.js';
import { resetCoupleData } from '../services/resetService.js';

export default function Universe() {
  const { coupleId } = useAuth();
  const { easterEggMessage } = useEasterEggs();
  const [resetBusy, setResetBusy] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const [resetStatus, setResetStatus] = useState('');

  async function onResetData() {
    const confirmed = window.confirm(
      'Clear shared data for this universe? This removes chat records, shared memories, letters and other saved entries for both partners.',
    );
    if (!confirmed || resetBusy) return;

    setResetBusy(true);
    setResetStatus('');
    try {
      const result = await resetCoupleData(coupleId);
      setResetVersion((value) => value + 1);
      if (result.mode === 'firebase') {
        setResetStatus(`Shared data cleared: ${result.deletedDocs} records and ${result.deletedFiles} files removed.`);
      } else {
        setResetStatus('Local preview data cleared.');
      }
    } catch {
      setResetStatus('Unable to clear data. Please try again.');
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <PageShell className="px-3 pb-28 pt-[calc(0.65rem+env(safe-area-inset-top))] sm:px-8 sm:pb-28 sm:pt-6 lg:pb-10 lg:pt-24">
      <div className="mx-auto w-full max-w-6xl">
        <header className="sticky top-[calc(0.35rem+env(safe-area-inset-top))] z-30 -mx-0.5 mb-3 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-midnight/88 px-3 py-2.5 shadow-[0_12px_36px_rgba(0,0,0,.28)] backdrop-blur-xl lg:hidden">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blush/10 text-blush ring-1 ring-blush/15">
            <Heart size={17} fill="currentColor" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-base leading-none text-white">Our Hidden Universe</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-pink-100/42">Private space for two</p>
          </div>
        </header>

        {resetStatus ? (
          <p className="mb-3 rounded-2xl border border-white/15 bg-black/35 px-4 py-2 text-xs text-pink-100/85">
            {resetStatus}
          </p>
        ) : null}

        {easterEggMessage ? (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 py-2 text-xs text-blush"
          >
            <Sparkles size={12} />
            {easterEggMessage}
          </motion.p>
        ) : null}

        <Outlet context={{ resetVersion, resetBusy, onResetData }} />
      </div>
      <BottomNav />
    </PageShell>
  );
}