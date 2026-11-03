import { ArrowRight, BookOpen, Settings2, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCall } from '../calls/CallContext.jsx';
import HomeNightSky from '../components/HomeNightSky.jsx';
import CoupleCodeCard from '../components/CoupleCodeCard.jsx';
import PrivateSunSurprise from '../components/PrivateSunSurprise.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  loadLocalProfile,
  loadLocalReadTogether,
  subscribeCoupleMembers,
  subscribeReadTogether,
  touchMemberPresence,
} from '../services/coupleDashboardService.js';
import { firebaseEnabled } from '../services/firebase.js';

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
      detail: 'Share the couple code below when they are ready to join.',
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
  const location = useLocation();
  const justCreated = new URLSearchParams(location.search).get('created') === '1';
  const { startCall, partner: callPartner, call } = useCall();
  const [profile] = useState(() => loadLocalProfile());
  const [members, setMembers] = useState([]);
  const [membersLoaded, setMembersLoaded] = useState(!firebaseEnabled);
  const [memberError, setMemberError] = useState('');
  const [readTogether, setReadTogether] = useState(() => loadLocalReadTogether());
  const [callError, setCallError] = useState('');
  const [sunSecretOpen, setSunSecretOpen] = useState(false);
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
  }

  function closeSunSecret() {
    setSunSecretOpen(false);
  }

  const videoCallDisabled = !callPartner || call.status !== 'idle';
  const readingLabel = readTogether.title || 'Choose something to do together';
  const selfSpot = [readTogether.selfChapter, readTogether.selfPage].filter(Boolean).join(' · ');
  const partnerSpot = [readTogether.partnerChapter, readTogether.partnerPage].filter(Boolean).join(' · ');
  const readingDetail = readTogether.title
    ? [
        selfSpot ? `You: ${selfSpot}` : 'Save your current reading spot',
        partnerSpot ? `${readTogether.partnerName || 'Partner'}: ${partnerSpot}` : '',
      ].filter(Boolean).join(' · ')
    : 'Watch something, read together, or start a shared activity.';

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="glass rounded-3xl px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-roseGold">Together today</p>
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
            aria-label="Open your universe settings"
          >
            <Settings2 size={18} />
          </Link>
        </div>

        <button
          type="button"
          onClick={startVideoCall}
          disabled={videoCallDisabled}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blush to-roseGold px-4 text-sm font-semibold text-midnight transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:min-w-44"
        >
          <Video size={17} />
          {call.status === 'idle' ? 'Start video call' : 'Call in progress'}
        </button>
        {callError ? <p className="mt-2 text-xs text-red-200">{callError}</p> : null}
      </section>

      <CoupleCodeCard isNew={justCreated} />

      <HomeNightSky onSunSecret={openSunSecret} />

      <Link to="/universe/together" className="group glass block rounded-2xl p-4 transition hover:border-blush/45 sm:rounded-3xl sm:p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blush/10 text-blush ring-1 ring-blush/15">
            <BookOpen size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.18em] text-roseGold">Continue together</p>
            <h2 className="mt-1 font-display text-2xl text-white">{readingLabel}</h2>
            <p className="mt-1 text-sm leading-6 text-pink-100/60">{readingDetail}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blush">
              Open Together <ArrowRight size={14} className="transition group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </Link>

      {sunSecretOpen ? <PrivateSunSurprise onClose={closeSunSecret} /> : null}
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