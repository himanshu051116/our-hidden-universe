import { motion } from 'framer-motion';
import { Cake, Copy, DatabaseZap, Heart, Home, ListTodo, LogOut, MessageCircleHeart, MoreHorizontal, Pencil, Sparkles, CalendarClock, Stars, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import PageShell from '../components/PageShell.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useEasterEggs from '../hooks/useEasterEggs.js';
import { resetCoupleData } from '../services/resetService.js';

export default function Universe() {
  const { logout, coupleId, coupleCodeDisplay } = useAuth();
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
  const [copyStatus, setCopyStatus] = useState('');
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    function onScroll() {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollYRef.current;
      if (Math.abs(delta) < 8) return;
      setNavVisible(delta < 0 || currentY < 40);
      lastScrollYRef.current = currentY;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  async function copyCode() {
    if (!coupleCodeDisplay) return;
    try {
      await navigator.clipboard.writeText(coupleCodeDisplay);
      setCopyStatus('Couple code copied');
      window.setTimeout(() => setCopyStatus(''), 1800);
    } catch {
      setCopyStatus('Copy failed');
      window.setTimeout(() => setCopyStatus(''), 1800);
    }
  }

  return (
    <PageShell className="px-4 pb-32 pt-5 sm:px-8 sm:pb-28 sm:pt-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="glass mb-5 rounded-3xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-roseGold">Our Hidden Universe</p>
              <h1 className="mt-1 font-display text-[2rem] leading-tight text-white sm:text-4xl">Private space for your love story</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              {coupleCodeDisplay ? (
                <button
                  type="button"
                  onClick={copyCode}
                  className="inline-flex items-center gap-2 rounded-full border border-blush/40 bg-blush/10 px-3 py-2 text-xs text-blush transition hover:bg-blush/20"
                  title="Copy your private couple code"
                >
                  <Copy size={13} />
                  {coupleCodeDisplay}
                </button>
              ) : null}
            </div>
          </div>
        </header>

        {resetStatus ? (
          <p className="mb-4 rounded-2xl border border-white/15 bg-black/35 px-4 py-2 text-xs text-pink-100/85">
            {resetStatus}
          </p>
        ) : null}

        {copyStatus ? (
          <p className="mb-4 inline-flex rounded-full border border-white/15 bg-black/35 px-4 py-2 text-xs text-pink-100/85">
            {copyStatus}
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
      <BottomNav
        visible={navVisible}
        logout={logout}
        onResetData={onResetData}
        resetBusy={resetBusy}
      />
    </PageShell>
  );
}

function BottomNav({ visible, logout, onResetData, resetBusy }) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <motion.nav
      initial={false}
      animate={{ y: visible ? 0 : 120, opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-midnight/92 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_45px_rgba(0,0,0,.35)] backdrop-blur-xl"
    >
      <div className="relative mx-auto flex max-w-md items-stretch justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-2 py-2">
        <BottomNavLink to="/universe/home" icon={<Home size={19} />} label="Home" />
        <BottomNavLink to="/universe/chat" icon={<MessageCircleHeart size={19} />} label="Chat" />
        <BottomNavLink to="/universe/timeline" icon={<CalendarClock size={19} />} label="Timeline" />
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          className={`flex min-h-[58px] min-w-[70px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] leading-none transition sm:min-w-[76px] ${
            moreOpen ? 'border-blush/70 bg-blush/20 text-white' : 'border-white/15 text-pink-100 hover:border-blush/70'
          }`}
          aria-label={moreOpen ? 'Close more menu' : 'Open more menu'}
          aria-expanded={moreOpen}
        >
          {moreOpen ? <X size={19} /> : <MoreHorizontal size={19} />}
          <span>More</span>
        </button>

        {moreOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute bottom-[calc(100%+0.75rem)] right-0 w-[min(21rem,calc(100vw-1rem))] rounded-3xl border border-white/10 bg-midnight/95 p-3 shadow-[0_18px_55px_rgba(0,0,0,.45)] backdrop-blur-xl"
          >
            <div className="grid grid-cols-2 gap-2">
              <MoreLink to="/universe/sky" icon={<Stars size={17} />} label="Night Sky" accent onClick={() => setMoreOpen(false)} />
              <MoreLink to="/universe/open-when" icon={<Heart size={17} />} label="Open When" onClick={() => setMoreOpen(false)} />
              <MoreLink to="/universe/extras" icon={<ListTodo size={17} />} label="Extras" onClick={() => setMoreOpen(false)} />
              <MoreLink to="/birthday-surprise" icon={<Cake size={17} />} label="Surprise" accent onClick={() => setMoreOpen(false)} />
              <MoreLink to="/birthday-surprise/edit" icon={<Pencil size={17} />} label="Edit Surprise" onClick={() => setMoreOpen(false)} />
              <MoreButton icon={<LogOut size={17} />} label="Logout" onClick={() => { setMoreOpen(false); logout(); }} />
              <MoreButton icon={<DatabaseZap size={17} />} label={resetBusy ? 'Clearing' : 'Clear Data'} onClick={onResetData} disabled={resetBusy} accent />
            </div>
          </motion.div>
        ) : null}
      </div>
    </motion.nav>
  );
}

function BottomNavLink({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex min-h-[58px] min-w-[70px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] leading-none transition sm:min-w-[76px] ${
          isActive
            ? 'border-blush/70 bg-blush/20 text-white'
            : 'border-white/15 text-pink-100 hover:border-blush/70'
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

function MoreLink({ to, icon, label, onClick, accent = false }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex min-h-12 items-center gap-2 rounded-2xl border px-3 py-2 text-xs transition ${
        accent
          ? 'border-roseGold/60 text-roseGold hover:bg-roseGold/10'
          : 'border-white/15 text-pink-100 hover:border-blush/70'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function MoreButton({ icon, label, onClick, disabled = false, accent = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-12 items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs transition disabled:opacity-60 ${
        accent
          ? 'border-roseGold/60 text-roseGold hover:bg-roseGold/10'
          : 'border-white/15 text-pink-100 hover:border-blush/70'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
