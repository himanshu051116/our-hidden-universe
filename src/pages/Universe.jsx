import { motion } from 'framer-motion';
import { Check, Copy, Sparkles } from 'lucide-react';
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
      window.setTimeout(() => setCopiedCode(false), 1800);
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
    <PageShell className="px-4 pb-32 pt-5 sm:px-8 sm:pb-28 sm:pt-6 lg:pb-10 lg:pt-24">
      <div className="mx-auto w-full max-w-6xl">
        {coupleId ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-3.5 py-2.5 backdrop-blur-md sm:px-4">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-pink-100/45">Couple code</p>
              <p className="mt-0.5 truncate font-mono text-sm font-semibold tracking-[0.16em] text-white">{coupleId}</p>
            </div>
            <button
              type="button"
              onClick={onCopyCoupleCode}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 text-xs font-medium text-pink-100 transition hover:border-blush/45 hover:text-white"
              aria-label="Copy couple code"
            >
              {copiedCode ? <Check size={14} /> : <Copy size={14} />}
              {copiedCode ? 'Copied' : 'Copy code'}
            </button>
          </div>
        ) : null}

        {resetStatus ? (
          <p className="mb-4 rounded-2xl border border-white/15 bg-black/35 px-4 py-2 text-xs text-pink-100/85">
            {resetStatus}
          </p>
        ) : null}

        {easterEggMessage ? (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 py-2 text-xs text-blush"
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
