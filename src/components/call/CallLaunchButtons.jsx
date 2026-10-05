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
  const unavailableReason = roomMemberCount > 2
    ? 'Private calling needs exactly two people in this universe.'
    : 'Your partner needs to join this universe before you can call.';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end gap-2 px-1">
        <button
          type="button"
          disabled={!partner || busy}
          onClick={() => launch('audio')}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.045] text-pink-100 transition hover:border-blush/40 hover:text-white active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Start audio call"
          title={partner ? 'Audio call' : unavailableReason}
        >
          <Phone size={17} />
        </button>

        <button
          type="button"
          disabled={!partner || busy}
          onClick={() => launch('video')}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-blush to-roseGold text-midnight transition hover:brightness-105 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Start video call"
          title={partner ? 'Video call' : unavailableReason}
        >
          <Video size={17} />
        </button>
      </div>

      {!partner ? <p className="px-1 text-right text-[11px] text-pink-100/42">{unavailableReason}</p> : null}
      {busy ? <p className="px-1 text-right text-[11px] text-pink-100/42">Call controls are active above the app.</p> : null}
      {error ? <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p> : null}
    </div>
  );
}