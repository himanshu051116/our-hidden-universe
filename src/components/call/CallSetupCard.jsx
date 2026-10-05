import { BellOff, BellRing, CheckCircle2, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCall } from '../../calls/CallContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getCallNotificationReadiness } from '../../services/callNotificationService.js';

function messageFor(status) {
  if (status === 'enabled') return 'Incoming call alerts are enabled on this device.';
  if (status === 'prompt') return 'Allow incoming call alerts so your partner can reach you while OHS is in the background.';
  if (status === 'ready') return 'Notification permission is already allowed. Finish enabling alerts for this device.';
  if (status === 'blocked') return 'Notifications are blocked for OHS. Allow them in your browser or app settings.';
  return '';
}

export default function CallSetupCard() {
  const { user, coupleId } = useAuth();
  const { notificationStatus, enableCallNotifications } = useCall();
  const [readiness, setReadiness] = useState({ loading: true, status: 'checking', canEnable: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function refreshReadiness() {
    if (!user?.uid || !coupleId) return;
    setReadiness((current) => ({ ...current, loading: true }));
    try {
      const next = await getCallNotificationReadiness(coupleId, user);
      setReadiness({ ...next, loading: false });
    } catch {
      setReadiness({ loading: false, status: 'unavailable', canEnable: false });
    }
  }

  useEffect(() => {
    refreshReadiness();
  }, [user?.uid, coupleId]);

  const effectiveStatus = notificationStatus.enabled
    ? 'enabled'
    : readiness.loading
      ? 'checking'
      : readiness.status || notificationStatus.status || 'unknown';

  const hiddenUntilConfigured = ['server-unavailable', 'misconfigured', 'unsupported', 'unavailable'].includes(effectiveStatus);
  if (!readiness.loading && hiddenUntilConfigured) return null;

  const enabled = effectiveStatus === 'enabled';
  const canEnable = !enabled && Boolean(readiness.canEnable);

  async function onEnable() {
    if (busy || !canEnable) return;
    setBusy(true);
    setError('');
    try {
      const result = await enableCallNotifications();
      if (!result?.enabled && result?.status === 'blocked') {
        setError('Notification permission is blocked in your browser or app settings.');
      } else if (!result?.enabled && result?.status !== 'enabled') {
        setError('Incoming call alerts could not be enabled on this device.');
      }
      await refreshReadiness();
    } catch {
      setError('Unable to enable incoming call alerts right now.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`mb-3 rounded-2xl border px-3.5 py-3 ${enabled ? 'border-emerald-300/15 bg-emerald-300/[0.045]' : 'border-white/10 bg-white/[0.025]'}`}>
      <div className="flex items-center gap-3">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${enabled ? 'bg-emerald-300/10 text-emerald-200' : 'bg-blush/10 text-blush'}`}>
          {readiness.loading ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : enabled ? (
            <CheckCircle2 size={16} />
          ) : effectiveStatus === 'blocked' ? (
            <BellOff size={16} />
          ) : (
            <BellRing size={16} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-white">Call alerts</p>
          <p className="mt-0.5 text-[11px] leading-4 text-pink-100/55">{readiness.loading ? 'Checking this device…' : messageFor(effectiveStatus)}</p>
        </div>

        {canEnable ? (
          <button
            type="button"
            onClick={onEnable}
            disabled={busy}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-blush/12 px-3 text-[11px] font-semibold text-blush ring-1 ring-blush/20 transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? <LoaderCircle size={13} className="animate-spin" /> : <BellRing size={13} />}
            {effectiveStatus === 'ready' ? 'Finish' : 'Enable'}
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-2 rounded-xl bg-red-500/10 px-3 py-2 text-[11px] text-red-200">{error}</p> : null}
    </section>
  );
}
