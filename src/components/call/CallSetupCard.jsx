import { BellOff, BellRing, CheckCircle2, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCall } from '../../calls/CallContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getCallNotificationReadiness } from '../../services/callNotificationService.js';

function messageFor(status) {
  if (status === 'enabled') {
    return 'Incoming call alerts are enabled on this device.';
  }
  if (status === 'prompt') {
    return 'Enable incoming call alerts so your partner can reach you when OHS is in the background.';
  }
  if (status === 'ready') {
    return 'Notification permission is already allowed. Finish enabling alerts for this device.';
  }
  if (status === 'blocked') {
    return 'Notifications are blocked for OHS. Allow notifications in your browser or app settings to receive background call alerts.';
  }
  if (status === 'server-unavailable' || status === 'misconfigured') {
    return 'Background call alerts are not fully configured on this deployment yet. Calls still work while OHS is open.';
  }
  if (status === 'unsupported') {
    return 'This browser does not support background call alerts. Calls still work while OHS is open.';
  }
  if (status === 'unavailable') {
    return 'Background call alerts are unavailable right now.';
  }
  return 'Checking call alert readiness…';
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
    <section className={`mb-3 rounded-2xl border px-3.5 py-3.5 sm:px-4 ${enabled ? 'border-emerald-300/15 bg-emerald-300/[0.05]' : 'border-white/10 bg-black/25'}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${enabled ? 'bg-emerald-300/10 text-emerald-200' : 'bg-blush/10 text-blush'}`}>
            {readiness.loading ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : enabled ? (
              <CheckCircle2 size={17} />
            ) : effectiveStatus === 'blocked' ? (
              <BellOff size={17} />
            ) : (
              <BellRing size={17} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.16em] text-roseGold">Call setup</p>
            <p className="mt-1 text-sm leading-5 text-pink-100/75">{messageFor(effectiveStatus)}</p>
            <p className="mt-1 text-[11px] leading-4 text-pink-100/42">
              Microphone and camera access are requested only when you start or answer a call.
            </p>
          </div>
        </div>

        {canEnable ? (
          <button
            type="button"
            onClick={onEnable}
            disabled={busy}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-4 text-xs font-semibold text-midnight transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? <LoaderCircle size={14} className="animate-spin" /> : <BellRing size={14} />}
            {effectiveStatus === 'ready' ? 'Finish setup' : 'Enable alerts'}
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-xs text-red-200">{error}</p> : null}
    </section>
  );
}
