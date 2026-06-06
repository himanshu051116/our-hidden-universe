import { motion } from 'framer-motion';
import { BookOpen, CheckCheck, Copy, Heart, KeyRound, LockKeyhole, MessageCircleHeart, ShieldCheck, Wifi, WifiOff, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import HomeNightSky from '../components/HomeNightSky.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  loadLocalProfile,
  loadLocalReadTogether,
  saveLocalProfile,
  saveReadTogether,
  subscribeCoupleMembers,
  subscribeReadTogether,
  touchMemberPresence,
} from '../services/coupleDashboardService.js';
import { firebaseEnabled } from '../services/firebase.js';

const sunSecretPassword = 'jaan';
const sunSurpriseImage = '/secret-sun-surprise.jpeg';

function toDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getPartnerStatus(members, userId, membersLoaded, memberError) {
  if (memberError) {
    return {
      label: 'Room check blocked',
      tone: 'error',
      detail: 'Check Firebase rules and reload the room.',
    };
  }
  if (!firebaseEnabled) {
    return {
      label: 'Preview mode',
      tone: 'idle',
      detail: 'Two-phone waiting works after Firebase env vars are loaded.',
    };
  }
  if (!membersLoaded) {
    return {
      label: 'Checking room',
      tone: 'idle',
      detail: 'Looking for your partner in this couple code.',
    };
  }
  const partner = members.find((member) => member.id !== userId);
  if (!partner) {
    return {
      label: 'Waiting for partner',
      tone: 'waiting',
      detail: 'Share this code and ask them to open the same room.',
    };
  }
  const lastActive = toDate(partner.lastActiveAt);
  const online = lastActive ? Date.now() - lastActive.getTime() < 2 * 60 * 1000 : false;
  return {
    label: online ? 'Partner online' : 'Partner offline',
    tone: online ? 'online' : 'offline',
    detail: lastActive ? `Last active ${lastActive.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Presence not updated yet',
  };
}

export default function UniverseHome() {
  const { user, coupleId, coupleCodeDisplay } = useAuth();
  const [sunSecretOpen, setSunSecretOpen] = useState(false);
  const [sunSecretUnlocked, setSunSecretUnlocked] = useState(false);
  const [sunPassword, setSunPassword] = useState('');
  const [sunError, setSunError] = useState('');
  const [profile, setProfile] = useState(() => loadLocalProfile());
  const [members, setMembers] = useState([]);
  const [membersLoaded, setMembersLoaded] = useState(!firebaseEnabled);
  const [memberError, setMemberError] = useState('');
  const [copied, setCopied] = useState(false);
  const [readTogether, setReadTogether] = useState(() => loadLocalReadTogether());
  const [readSaveState, setReadSaveState] = useState('');
  const partnerStatus = getPartnerStatus(members, user?.uid, membersLoaded, memberError);

  useEffect(() => {
    saveLocalProfile(profile);
  }, [profile]);

  useEffect(() => {
    setMemberError('');
    setMembersLoaded(!firebaseEnabled);
    const unsubscribeMembers = subscribeCoupleMembers(
      coupleId,
      (nextMembers) => {
        setMembers(nextMembers);
        setMembersLoaded(true);
      },
      () => {
        setMemberError('blocked');
        setMembersLoaded(true);
      },
    );
    touchMemberPresence(coupleId, user).catch(() => setMemberError('blocked'));
    const presenceTimer = window.setInterval(() => {
      touchMemberPresence(coupleId, user).catch(() => setMemberError('blocked'));
    }, 45000);

    return () => {
      unsubscribeMembers?.();
      window.clearInterval(presenceTimer);
    };
  }, [coupleId, user]);

  useEffect(() => {
    const unsubscribe = subscribeReadTogether(coupleId, (state) => {
      const selfProgress = state.progressByUser?.[user?.uid] || {};
      const partnerProgress = Object.entries(state.progressByUser || {}).find(([uid]) => uid !== user?.uid)?.[1] || {};
      setReadTogether({
        title: state.title || '',
        link: state.link || '',
        selfChapter: selfProgress.chapter || '',
        selfPage: selfProgress.page || '',
        partnerChapter: partnerProgress.chapter || '',
        partnerPage: partnerProgress.page || '',
        partnerName: partnerProgress.displayName || 'Partner',
        progressByUser: state.progressByUser || {},
      });
    });
    return () => unsubscribe?.();
  }, [coupleId, user?.uid]);

  function openSunSecret() {
    setSunSecretOpen(true);
    setSunError('');
  }

  function unlockSunSecret(event) {
    event.preventDefault();
    if (sunPassword.trim().toLowerCase() !== sunSecretPassword) {
      setSunError('That is not the secret word yet.');
      return;
    }
    setSunSecretUnlocked(true);
    setSunError('');
  }

  function closeSunSecret() {
    setSunSecretOpen(false);
    setSunSecretUnlocked(false);
    setSunPassword('');
    setSunError('');
  }

  async function copyCoupleCode() {
    if (!coupleCodeDisplay) return;
    await navigator.clipboard.writeText(coupleCodeDisplay);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function onSaveReading(event) {
    event.preventDefault();
    await saveReadTogether(coupleId, user, readTogether);
    setReadSaveState('Saved for both');
    window.setTimeout(() => setReadSaveState(''), 1600);
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="grid items-stretch gap-4 xl:grid-cols-[1.45fr_.55fr]">
        <HomeNightSky onSunSecret={openSunSecret} />

        <aside className="glass flex flex-col justify-between rounded-2xl p-4 sm:rounded-3xl sm:p-5">
          <div>
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-roseGold">
              <ShieldCheck size={14} />
              Partner Room
            </p>
            <input
              value={profile.coupleName}
              onChange={(event) => setProfile((previous) => ({ ...previous, coupleName: event.target.value }))}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 font-display text-3xl leading-tight text-white outline-none transition focus:border-blush/70"
              placeholder="Our Hidden Universe"
            />

            <StatusTile status={partnerStatus} />

            <button
              type="button"
              onClick={copyCoupleCode}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-black/35 p-4 text-left transition hover:border-blush/60"
            >
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-roseGold">
                <KeyRound size={14} />
                Couple Code
              </span>
              <span className="mt-2 flex items-center justify-between gap-3 text-sm text-pink-100">
                <span className="truncate">{copied ? 'Copied' : coupleCodeDisplay || 'No code yet'}</span>
                <Copy size={14} className="shrink-0 text-blush" />
              </span>
            </button>
          </div>

          <Link
            to="/universe/chat"
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-5 py-2 text-sm font-semibold text-midnight transition hover:brightness-105"
          >
            <MessageCircleHeart size={16} />
            Open chat
          </Link>
        </aside>
      </section>

      <section className="glass rounded-2xl p-4 sm:rounded-3xl sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-roseGold">
            <BookOpen size={14} />
            Partner Writing
          </p>
          <p className="text-xs text-pink-100/55">Keep only your current shared reading spot here.</p>
        </div>
        <form onSubmit={onSaveReading} className="mt-4 grid gap-3 lg:grid-cols-[1fr_.7fr_.7fr_auto]">
            <input
              value={readTogether.title}
              onChange={(event) => setReadTogether((previous) => ({ ...previous, title: event.target.value }))}
              placeholder="Title or topic"
              className="min-h-11 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-blush/70"
            />
            <input
              value={readTogether.selfChapter}
              onChange={(event) => setReadTogether((previous) => ({ ...previous, selfChapter: event.target.value }))}
              placeholder="My chapter"
              className="min-h-11 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-blush/70"
            />
            <input
              value={readTogether.selfPage}
              onChange={(event) => setReadTogether((previous) => ({ ...previous, selfPage: event.target.value }))}
              placeholder="My page"
              className="min-h-11 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-blush/70"
            />
            <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-pink-100 transition hover:bg-white/15">
              <CheckCheck size={15} />
              Save
            </button>
          </form>
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-pink-100/75">
            {readTogether.partnerChapter || readTogether.partnerPage
              ? `${readTogether.partnerName || 'Partner'} is at ${readTogether.partnerChapter || '--'} / ${readTogether.partnerPage || '--'}`
              : 'Partner progress will appear after they save their spot.'}
            {readSaveState ? <span className="ml-3 text-xs text-blush">{readSaveState}</span> : null}
          </div>
      </section>

      {sunSecretOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 px-4 py-6 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="glass relative w-full max-w-lg rounded-3xl p-5 sm:p-6"
          >
            <button
              type="button"
              onClick={closeSunSecret}
              className="absolute right-4 top-4 rounded-full border border-white/15 p-2 text-pink-100 transition hover:border-blush/70 hover:text-white"
              aria-label="Close secret"
            >
              <X size={16} />
            </button>

            {!sunSecretUnlocked ? (
              <form onSubmit={unlockSunSecret} className="pr-8">
                <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-roseGold">
                  <LockKeyhole size={13} />
                  Sun secret
                </p>
                <h3 className="mt-2 font-display text-3xl text-white">The sun is inside your universe</h3>
                <p className="mt-2 text-sm text-pink-100/75">Enter the secret password to open what the sun is holding.</p>

                <input
                  type="password"
                  autoFocus
                  value={sunPassword}
                  onChange={(event) => {
                    setSunPassword(event.target.value);
                    setSunError('');
                  }}
                  className="mt-5 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-blush/70"
                  placeholder="Password"
                />
                {sunError ? <p className="mt-2 text-xs text-red-200">{sunError}</p> : null}

                <button
                  type="submit"
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-5 py-2.5 text-sm font-semibold text-midnight transition hover:brightness-105"
                >
                  <Heart size={15} />
                  Unlock
                </button>
              </form>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/35">
                <div className="relative">
                  <img src={sunSurpriseImage} alt="Forever yours Jaan" className="max-h-[72vh] w-full object-contain" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-5 pb-5 pt-16 text-center">
                    <p className="font-display text-3xl text-white drop-shadow sm:text-5xl">Forever yours Jaan</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}

function StatusTile({ status }) {
  const tone = {
    online: {
      icon: <Wifi size={16} />,
      text: 'text-emerald-200',
      dot: 'bg-emerald-300',
      glow: 'shadow-[0_0_28px_rgba(110,231,183,.22)]',
    },
    waiting: {
      icon: <WifiOff size={16} />,
      text: 'text-roseGold',
      dot: 'bg-roseGold',
      glow: 'shadow-[0_0_28px_rgba(216,160,127,.18)]',
    },
    offline: {
      icon: <WifiOff size={16} />,
      text: 'text-pink-100/75',
      dot: 'bg-pink-100/45',
      glow: '',
    },
    error: {
      icon: <WifiOff size={16} />,
      text: 'text-red-200',
      dot: 'bg-red-300',
      glow: 'shadow-[0_0_28px_rgba(252,165,165,.18)]',
    },
    idle: {
      icon: <Wifi size={16} />,
      text: 'text-roseGold',
      dot: 'bg-roseGold/70',
      glow: '',
    },
  }[status.tone] || {};

  return (
    <div className={`mt-4 rounded-2xl border border-white/10 bg-black/35 p-4 ${tone.glow}`}>
      <p className={`inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] ${tone.text}`}>
        {tone.icon}
        {status.label}
      </p>
      <p className="mt-2 text-sm leading-5 text-pink-100/75">{status.detail}</p>
      <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] text-pink-100/70">
        <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
        {status.tone === 'waiting' ? 'Waiting is active' : status.tone === 'online' ? 'Connected now' : 'Status updates automatically'}
      </span>
    </div>
  );
}
