import { Bell, BellRing, Phone, Video } from 'lucide-react';
import { useState } from 'react';
import { useCall } from '../../calls/CallContext.jsx';

export default function CallLaunchButtons() {
  const {
    startCall,
    partner,
    roomMemberCount,
    call,
    notificationStatus,
    enableCallNotifications,
  } = useCall();

  const [error, setError] = useState('');
  const [notificationBusy, setNotificationBusy] = useState(false);

  async function launch(type) {
    setError('');
    try {
      await startCall(type);
    } catch (callError) {
      setError(callError?.message || 'Unable to start the call.');
    }
  }

  async function enableAlerts() {
    setNotificationBusy(true);
    setError('');
    try {
      const result = await enableCallNotifications();
      if (!result.enabled) {
        const message = {
          blocked: 'Call notification permission is blocked in your device settings.',
          prompt: 'Call notifications were not enabled.',
          misconfigured: 'Web push needs VITE_FIREBASE_VAPID_KEY.',
          unsupported: 'This browser does not support Firebase web push.',
        }[result.status] || 'Unable to enable call notifications.';
        setError(message);
      }
    } catch (notificationError) {
      setError(notificationError?.message || 'Unable to enable call notifications.');
    } finally {
      setNotificationBusy(false);
    }
  }

  const busy = call.status !== 'idle';

  return (
    <div className="mb-3 rounded-2xl border border-white/10 bg-black/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!partner || busy}
          onClick={() => launch('audio')}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-xs text-pink-100 transition hover:border-blush/70 disabled:opacity-40"
        >
          <Phone size={15} />
          Audio call
        </button>

        <button
          type="button"
          disabled={!partner || busy}
          onClick={() => launch('video')}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-4 text-xs font-semibold text-midnight transition hover:brightness-105 disabled:opacity-40"
        >
          <Video size={15} />
          Video call
        </button>

        <button
          type="button"
          disabled={notificationBusy || notificationStatus.enabled}
          onClick={enableAlerts}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-xs text-pink-100 transition hover:border-blush/70 disabled:opacity-60"
        >
          {notificationStatus.enabled ? <BellRing size={15} /> : <Bell size={15} />}
          {notificationStatus.enabled ? 'Call alerts on' : 'Enable call alerts'}
        </button>

        {!partner ? (
          <span className="text-[11px] text-pink-100/55">
            {roomMemberCount > 2
              ? 'Private calling is blocked because this room has more than two members.'
              : 'Partner must join this room first.'}
          </span>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-xs text-red-200">{error}</p> : null}
    </div>
  );
}
