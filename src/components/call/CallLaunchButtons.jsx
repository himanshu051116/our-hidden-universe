import { Phone, Video } from 'lucide-react';
import { useState } from 'react';
import { useCall } from '../../calls/CallContext.jsx';

export default function CallLaunchButtons() {
  const { startCall, partner, roomMemberCount, call } = useCall();
  const [error, setError] = useState('');

  async function launch(type) {
    setError('');
    try {
      await startCall(type);
    } catch (callError) {
      setError(callError?.message || 'Unable to start the call.');
    }
  }

  const busy = call.status !== 'idle';
  const partnerName = partner?.displayName || partner?.email || 'Partner';

  return (
    <section className="mb-3 flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.16em] text-roseGold">Conversation</p>
        <p className="mt-1 truncate text-sm font-semibold text-white">{partner ? partnerName : 'Waiting for partner'}</p>
        {!partner ? (
          <p className="mt-1 text-[11px] text-pink-100/50">
            {roomMemberCount > 2
              ? 'Private calling is unavailable because this universe has more than two members.'
              : 'Your partner needs to join before you can call.'}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!partner || busy}
          onClick={() => launch('audio')}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-pink-100 transition hover:border-blush/70 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Start audio call"
          title="Audio call"
        >
          <Phone size={17} />
        </button>

        <button
          type="button"
          disabled={!partner || busy}
          onClick={() => launch('video')}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-blush to-roseGold text-midnight transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Start video call"
          title="Video call"
        >
          <Video size={17} />
        </button>
      </div>

      {error ? <p className="text-xs text-red-200 sm:basis-full">{error}</p> : null}
    </section>
  );
}
