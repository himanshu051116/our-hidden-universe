import { motion } from 'framer-motion';
import { Check, Copy, Heart, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from '../components/navigation/BottomNav.jsx';
import PageShell from '../components/PageShell.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useEasterEggs from '../hooks/useEasterEggs.js';
import { resetCoupleData } from '../services/resetService.js';

export default function Universe() {
  const { coupleId, coupleCodeDisplay } = useAuth();
  const { easterEggMessage } = useEasterEggs();
  const [resetBusy, setResetBusy] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const [resetStatus, setResetStatus] = useState('');
  const [codeCopyStatus, setCodeCopyStatus] = useState('');

  async function copyCoupleCode() {
    if (!coupleCodeDisplay) return;
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(coupleCodeDisplay);
        copied = true;
      } else {
        // Clipboard API is not always available in older installed PWAs.
        const field = document.createElement('textarea');
        field.value = coupleCodeDisplay;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        copied = document.execCommand('copy');
        field.remove();
      }
    } catch {
      copied = false;
    }
    setCodeCopyStatus(copied ? 'Copied!' : 'Copy unavailable');
    window.setTimeout(() => setCodeCopyStatus(''), 2000);
  }

  async function onResetData() {
    const confirmed = window.confirm(
      'Clear saved OHS data for this universe? This permanently removes shared chat, memories, letters, activities and uploaded files for both partners, plus OHS data saved on this device. Your accounts and universe membership stay connected.',
    );
    if (!confirmed || resetBusy) return;

    setResetBusy(true);
    setResetStatus('');
    try {
      const result = await resetCoupleData(coupleId);
      setResetVersion((value) => value + 1);
      if (result.mode === 'firebase') {
        setResetStatus(`Saved OHS data cleared: ${result.deletedDocs} shared records and ${result.deletedFiles} uploaded files removed.`);
      } else {
        setResetStatus('OHS data saved on this device was cleared.');
      }
    } catch {
      setResetStatus('Some saved data could not be cleared. Please try again.');
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
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base leading-none text-white">Our Hidden Universe</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-pink-100/42">Private space for two</p>
          </div>
          <button
            type="button"
            onClick={copyCoupleCode}
            disabled={!coupleCodeDisplay}
            title={coupleCodeDisplay ? 'Copy couple code' : 'Couple code unavailable'}
            aria-label={codeCopyStatus || (coupleCodeDisplay ? `Copy couple code ${coupleCodeDisplay}` : 'Couple code unavailable')}
            className="flex min-h-11 min-w-0 max-w-[43%] shrink-0 items-center gap-1.5 rounded-xl border border-blush/25 bg-blush/[0.08] px-2.5 text-blush transition hover:bg-blush/[0.15] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush disabled:opacity-40"
          >
            <span className="min-w-0 text-left">
              <span className="block text-[9px] uppercase tracking-[0.12em] text-pink-100/55">Couple code</span>
              <span className="block truncate font-mono text-[11px] font-semibold tracking-wider">{codeCopyStatus || coupleCodeDisplay || '—'}</span>
            </span>
            {codeCopyStatus === 'Copied!' ? <Check size={15} className="shrink-0" aria-hidden="true" /> : <Copy size={14} className="shrink-0" aria-hidden="true" />}
          </button>
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