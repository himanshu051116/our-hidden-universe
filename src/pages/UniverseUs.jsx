import { ArrowRight, Bell, BellRing, Cake, DatabaseZap, Heart, Images, KeyRound, ListTodo, LogOut, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useCall } from '../calls/CallContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const experienceLinks = [
  {
    to: '/universe/memories',
    icon: Images,
    title: 'Memories',
    description: 'Shared photos, notes, voice moments and milestones that stay with your universe.',
    meta: 'Shared',
  },
  {
    to: '/universe/open-when',
    icon: Heart,
    title: 'Open When',
    description: 'Shared letters for the moments that need something personal.',
    meta: 'Shared',
  },
  {
    to: '/universe/extras',
    icon: ListTodo,
    title: 'Plans & little things',
    description: 'Your synced Bucket List plus clearly separated countdown, playlist and dream notes saved only on this device.',
    meta: 'Mixed',
  },
  {
    to: '/birthday-surprise',
    icon: Cake,
    title: 'Surprises',
    description: 'Special-event experiences kept away from the everyday navigation.',
    meta: 'Occasional',
  },
];

export default function UniverseUs() {
  const { logout, coupleCodeDisplay } = useAuth();
  const { notificationStatus, enableCallNotifications } = useCall();
  const { onResetData, resetBusy } = useOutletContext();
  const [copyStatus, setCopyStatus] = useState('');
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  async function copyCode() {
    if (!coupleCodeDisplay) return;
    try {
      await navigator.clipboard.writeText(coupleCodeDisplay);
      setCopyStatus('Copied');
    } catch {
      setCopyStatus('Copy unavailable');
    }
    window.setTimeout(() => setCopyStatus(''), 1600);
  }

  async function enableAlerts() {
    if (notificationBusy || notificationStatus.enabled) return;
    setNotificationBusy(true);
    setNotificationMessage('');
    try {
      const result = await enableCallNotifications();
      if (result.enabled) {
        setNotificationMessage('Call alerts are enabled on this device.');
      } else {
        const message = {
          blocked: 'Notifications are blocked in this device or browser settings.',
          prompt: 'Notification permission was not enabled.',
          misconfigured: 'Call alerts are not available on this deployment yet.',
          unsupported: 'This browser does not support call alerts.',
        }[result.status] || 'Unable to enable call alerts.';
        setNotificationMessage(message);
      }
    } catch {
      setNotificationMessage('Unable to enable call alerts right now.');
    } finally {
      setNotificationBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="px-1 sm:px-0">
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-roseGold">
          <Sparkles size={14} />
          Us
        </p>
        <h2 className="mt-1 font-display text-3xl text-white sm:text-4xl">The quieter parts of your universe.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-pink-100/62">Shared memories and letters live beside lower-frequency plans and account controls, without competing with Chat, Together, or Night Sky.</p>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {experienceLinks.map(({ to, icon: Icon, title, description, meta }) => (
          <Link key={title} to={to} className="group glass rounded-2xl p-4 transition hover:border-blush/45 sm:rounded-3xl sm:p-5">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-roseGold">
                <Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-2xl text-white">{title}</h3>
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-pink-100/42">{meta}</span>
                </div>
                <p className="mt-1 text-sm leading-5 text-pink-100/60">{description}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blush">
                  Open <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </section>

      <section className="glass rounded-2xl p-4 sm:rounded-3xl sm:p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-roseGold">Partner & account</p>
        <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
          <button type="button" onClick={copyCode} className="flex min-h-14 w-full items-center gap-3 px-4 text-left text-sm text-pink-100 transition hover:bg-white/[0.05]">
            <KeyRound size={17} className="text-roseGold" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-white">Couple code</span>
              <span className="block truncate text-xs text-pink-100/50">{coupleCodeDisplay || 'No code available'}</span>
            </span>
            <span className="text-xs text-blush">{copyStatus || 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={enableAlerts}
            disabled={notificationBusy || notificationStatus.enabled}
            className="flex min-h-14 w-full items-center gap-3 px-4 text-left text-sm text-pink-100 transition hover:bg-white/[0.05] disabled:opacity-65"
          >
            {notificationStatus.enabled ? <BellRing size={17} className="text-emerald-200" /> : <Bell size={17} className="text-roseGold" />}
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-white">Call alerts</span>
              <span className="block text-xs text-pink-100/50">
                {notificationStatus.enabled ? 'Enabled on this device' : notificationBusy ? 'Enabling…' : 'Enable incoming-call notifications'}
              </span>
            </span>
          </button>

          <button type="button" onClick={logout} className="flex min-h-14 w-full items-center gap-3 px-4 text-left text-sm text-pink-100 transition hover:bg-white/[0.05]">
            <LogOut size={17} className="text-roseGold" />
            <span>Log out</span>
          </button>

          <button
            type="button"
            onClick={onResetData}
            disabled={resetBusy}
            className="flex min-h-14 w-full items-center gap-3 px-4 text-left text-sm text-red-200 transition hover:bg-red-300/[0.05] disabled:opacity-50"
          >
            <DatabaseZap size={17} />
            <span>{resetBusy ? 'Clearing shared data…' : 'Clear shared data'}</span>
          </button>
        </div>
        {notificationMessage ? <p className="mt-3 text-xs text-pink-100/60">{notificationMessage}</p> : null}
      </section>
    </div>
  );
}
