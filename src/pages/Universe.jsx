import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
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
    <PageShell className="px-4 pb-32 pt-5 sm:px-8 sm:pb-28 sm:pt-6">
      <div className="mx-auto w-full max-w-6xl">
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
