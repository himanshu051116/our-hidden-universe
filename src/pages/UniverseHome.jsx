import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Heart, MessageCircleHeart, Settings2, Sparkles, Video, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCall } from '../calls/CallContext.jsx';
import HomeNightSky from '../components/HomeNightSky.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  loadLocalProfile,
  loadLocalReadTogether,
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
      label: 'Presence unavailable',
      tone: 'error',
      detail: 'We could not refresh your partner status. Try again in a moment.',
    };
  }
  if (!firebaseEnabled) {
    return {
      label: 'Preview mode',
      tone: 'idle',
      detail: 'Partner presence appears when the shared room connection is available.',
    };
  }
  if (!membersLoaded) {
    return {
      label: 'Checking your universe',
      tone: 'idle',
      detail: 'Looking for your partner.',
    };
  }
  const partner = members.find((member) => member.id !== userId);
  if (!partner) {
    return {
      label: 'Waiting for partner',
      tone: 'waiting',
      detail: 'Share your couple code from Us when they are ready to join.',
    };
  }
  const lastActive = toDate(partner.lastActiveAt);
  const online = lastActive ? Date.now() - lastActive.getTime() < 2 * 60 * 1000 : false;
  return {
    label: online ? 'Partner is here' : 'Partner is away',
    tone: online ? 'online' : 'offline',
    detail: lastActive
      ? `Last here ${lastActive.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : 'Presence will update when they return.',
  };
}

export default function UniverseHome() {
  const { user, coupleId } = useAuth();
  const { startCall, partner: callPartner, call } = useCall();
  const [profile] = useState(() => loadLocalProfile());
  const [members, setMembers] = useState([]);
  const [membersLoaded, setMembersLoaded] = useState(!firebaseEnabled);
  const [memberError, setMemberError] = useState('');
  const [readTogether, setReadTogether] = useState(() => loadLocalReadTogether());
  const [callError, setCallError] = useState('');
  const [sunSecretOpen, setSunSecretOpen] = useState(false);
  const [sunSecretUnlocked, setSunSecretUnlocked] = useState(false);
  const [sunPassword, setSunPassword] = useState('');
  const [sunError, setSunError] = useState('');
  const partnerStatus = getPartnerStatus(members, user?.uid, membersLoaded, memberError);

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
      });
    });
    return () => unsubscribe?.();
  }, [coupleId, user?.uid]);

  async function startVideoCall() {
    setCallError('');
    try {
      await startCall('video');
    } catch (error) {
      setCallError(error?.message || 'Unable to start the video call.');
    }
  }

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

  const videoCallDisabled = !callPartner || call.status !== 'idle';
  const readingLabel = readTogether.title || 'No shared read selected yet';
  const selfSpot = [readTogether.selfChapter, readTogether.selfPage].filter(Boolean).join(' · ');
  const partnerSpot = [readTogether.partnerChapter, readTogether.partnerPage].filter(Boolean).join(' · ');

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="glass rounded-3xl px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-roseGold">Our Hidden Universe</p>
            <h1 className="mt-1 truncate font-display text-3xl leading-tight text-white sm:text-4xl">{profile.coupleName || 'Our Hidden Universe'}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-pink-100/62">
              <PartnerDot tone={partnerStatus.tone} />
              <span className="font-medium text-pink-100/85">{partnerStatus.label}</span>
              <span>{partnerStatus.detail}</span>
            </div>
          </div>
          <Link
            to="/universe/us"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-pink-100/70 transition hover:border-blush/40 hover:text-white"
            aria-label="Open your universe settings and extras"
          >
            <Settings2 size={18} />
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Link to="/universe/chat" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-2 text-xs font-semibold text-pink-100 transition hover:border-blush/45">
            <MessageCircleHeart size={16} />
            Message
          </Link>
          <button
            type="button"
            onClick={startVideoCall}
            disabled={videoCallDisabled}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blush to-roseGold px-2 text-xs font-semibold text-midnight transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Video size={16} />
            Video
          </button>
          <Link to="/universe/together" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-2 text-xs font-semibold text-pink-100 transition hover:border-blush/45">
            <Sparkles size={16} />
            Together
          </Link>
        </div>
        {callError ? <p className="mt-2 text-xs text-red-200">{callError}</p> : null}
      </section>

      <HomeNightSky onSunSecret={openSunSecret} />

      <section className="grid gap-3 lg:grid-cols-2">
        <Link to="/universe/together/watch" className="group glass rounded-2xl p-4 transition hover:border-blush/45 sm:rounded-3xl sm:p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-roseGold">Continue together</p>
          <h2 className="mt-2 font-display text-2xl text-white">Watch Together</h2>
          <p className="mt-1 text-sm text-pink-100/60">Open your shared watch room and pick up where you left off.</p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blush">Open watch room <ArrowRight size={14} className="transition group-hover:translate-x-1" /></span>
        </Link>

        <Link to="/universe/extras#read-together" className="group glass rounded-2xl p-4 transition hover:border-blush/45 sm:rounded-3xl sm:p-5">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-roseGold"><BookOpen size={14} /> Read Together</p>
          <h2 className="mt-2 font-display text-2xl text-white">{readingLabel}</h2>
          <p className="mt-1 text-sm text-pink-100/60">
            {selfSpot ? `You: ${selfSpot}` : 'Save your current spot'}
            {partnerSpot ? ` · ${readTogether.partnerName || 'Partner'}: ${partnerSpot}` : ''}
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blush">Update progress <ArrowRight size={14} className="transition group-hover:translate-x-1" /></span>
        </Link>
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
                  <Heart size={13} />
                  Sun secret
                </p>
                <h3 className="mt-2 font-display text-3xl text-white">The sun is holding something for you.</h3>
                <p className="mt-2 text-sm text-pink-100/70">Enter the secret word to open it.</p>
                <input
                  type="password"
                  autoFocus
                  value={sunPassword}
                  onChange={(event) => {
                    setSunPassword(event.target.value);
                    setSunError('');
                  }}
                  className="mt-5 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-blush/70"
                  placeholder="Secret word"
                />
                {sunError ? <p className="mt-2 text-xs text-red-200">{sunError}</p> : null}
                <button type="submit" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-5 py-2.5 text-sm font-semibold text-midnight transition hover:brightness-105">
                  <Heart size={15} />
                  Unlock
                </button>
              </form>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/35">
                <div className="relative">
                  <img src={sunSurpriseImage} alt="A private surprise" className="max-h-[72vh] w-full object-contain" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-5 pb-5 pt-16 text-center">
                    <p className="font-display text-3xl text-white drop-shadow sm:text-5xl">Forever yours</p>
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

function PartnerDot({ tone }) {
  const className = {
    online: 'bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.6)]',
    waiting: 'bg-roseGold',
    offline: 'bg-pink-100/40',
    error: 'bg-red-300',
    idle: 'bg-roseGold/70',
  }[tone] || 'bg-pink-100/40';

  return <span className={`h-2.5 w-2.5 rounded-full ${className}`} aria-hidden="true" />;
}
