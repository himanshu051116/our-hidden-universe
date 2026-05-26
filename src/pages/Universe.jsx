import { motion } from 'framer-motion';
import { Cake, DatabaseZap, LogOut, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import PageShell from '../components/PageShell.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useEasterEggs from '../hooks/useEasterEggs.js';
import { resetCoupleData } from '../services/resetService.js';

export default function Universe() {
  const { logout, coupleId } = useAuth();
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
        setResetStatus('Local demo cache cleared.');
      }
    } catch {
      setResetStatus('Unable to clear data. Please check permissions and try again.');
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <PageShell className="px-4 pb-12 pt-6 sm:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="glass mb-5 rounded-3xl px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-roseGold">Our Hidden Universe</p>
              <h1 className="font-display text-3xl text-white sm:text-4xl">Private space for your love story</h1>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <UniverseNavLink to="/universe/home">Home</UniverseNavLink>
              <UniverseNavLink to="/universe/chat">Chat</UniverseNavLink>
              <UniverseNavLink to="/universe/timeline">Timeline</UniverseNavLink>
              <UniverseNavLink to="/universe/open-when">Open When</UniverseNavLink>
              <UniverseNavLink to="/universe/extras">Extras</UniverseNavLink>
              <Link to="/birthday-surprise" className="inline-flex items-center gap-2 rounded-full border border-roseGold/60 px-3 py-2 text-xs text-roseGold transition hover:bg-roseGold/10">
                <Cake size={13} />
                Surprise
              </Link>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs text-pink-100 transition hover:bg-white/20"
              >
                <LogOut size={13} />
                Logout
              </button>
              <button
                type="button"
                onClick={onResetData}
                disabled={resetBusy}
                className="inline-flex items-center gap-2 rounded-full border border-roseGold/60 bg-roseGold/10 px-3 py-2 text-xs text-roseGold transition hover:bg-roseGold/20 disabled:opacity-60"
              >
                <DatabaseZap size={13} />
                {resetBusy ? 'Clearing...' : 'Clear Data'}
              </button>
            </div>
          </div>
        </header>

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

        <Outlet context={{ messageCount, setMessageCount, resetVersion }} />
      </div>
    </PageShell>
  );
}

function UniverseNavLink({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-full border px-3 py-2 text-xs transition ${
          isActive
            ? 'border-blush/70 bg-blush/20 text-white'
            : 'border-white/15 text-pink-100 hover:border-blush/70'
        }`
      }
    >
      {children}
    </NavLink>
  );
}
