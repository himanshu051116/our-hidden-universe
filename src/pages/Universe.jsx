import { motion } from 'framer-motion';
import { Check, Copy, Heart, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from '../components/navigation/BottomNav.jsx';
import PageShell from '../components/PageShell.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useEasterEggs from '../hooks/useEasterEggs.js';
import { resetCoupleData } from '../services/resetService.js';

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  input.remove();
}

export default function Universe() {
  const { coupleId } = useAuth();
  const { easterEggMessage } = useEasterEggs();
  const [messageCount, setMessageCount] = useState(() => {
    try {
      const raw = localStorage.getItem('ohu-demo-messages-v1');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  });
  const [resetBusy, setResetBusy] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const [resetStatus, setResetStatus] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  async function onCopyCoupleCode() {
    if (!coupleId) return;
    try {
      await copyText(coupleId);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1600);
    } catch {
      setCopiedCode(false);
    }
  }

  async function onResetData() {
    const confirmed = window.confirm('Clear all couple data for this universe? This removes chat records and saved entries.');
    if (!confirmed || resetBusy) return;

    setResetBusy(true);
    setResetStatus('');
    try {
      const result = await resetCoupleData(coupleId);
      setResetVersion((value) => value + 1);
      setMessageCount(0);
      if (result.mode === 'firebase') {
        setResetStatus(`Data cleared: ${result.deletedDocs} records and ${result.deletedFiles} files removed.`);
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
        <header className="sticky top-[calc(0.35rem+env(safe-area-inset-top))] z-30 -mx-0.5 mb-3 flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-midnight/88 px-3 py-2.5 shadow-[0_12px_36px_rgba(0,0,0,.28)] backdrop-blur-xl lg:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blush/10 text-blush ring-1 ring-blush/15">
              <Heart size={17} fill="currentColor" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-base leading-none text-white">Our Hidden Universe</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-pink-100/42">Private space for two</p>
            </div>
          </div>

          {coupleId ? (
            <button
              type="button"
              onClick={onCopyCoupleCode}
              className="group flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-2.5 text-left transition active:scale-[0.98]"
              aria-label={`Copy couple code ${coupleId}`}
            >
              <div>
                <p className="text-[8px] uppercase tracking-[0.14em] text-pink-100/38">Couple code</p>
                <p className="mt-0.5 max-w-[6.8rem] truncate font-mono text-[11px] font-semibold tracking-[0.11em] text-white">{coupleId}</p>
              </div>
              <span className={`grid h-7 w-7 place-items-center rounded-lg ${copiedCode ? 'bg-emerald-300/10 text-emerald-200' : 'bg-white/[0.05] text-pink-100/70'}`}>
                {copiedCode ? <Check size={13} /> : <Copy size={13} />}
              </span>
            </button>
          ) : null}
        </header>

        {coupleId ? (
          <div className="mb-5 hidden items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-md lg:flex">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-pink-100/45">Couple code</p>
              <p className="mt-0.5 font-mono text-sm font-semibold tracking-[0.16em] text-white">{coupleId}</p>
            </div>
            <button
              type="button"
              onClick={onCopyCoupleCode}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 text-xs font-medium text-pink-100 transition hover:border-blush/45 hover:text-white"
            >
              {copiedCode ? <Check size={14} /> : <Copy size={14} />}
              {copiedCode ? 'Copied' : 'Copy code'}
            </button>
          </div>
        ) : null}

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

        <Outlet
          context={{
            messageCount,
            setMessageCount,
            resetVersion,
            resetBusy,
            onResetData,
          }}
        />
      </div>
      <BottomNav />
    </PageShell>
  );
}
