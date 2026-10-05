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
    <section className="mb-3 rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.015))] p-3.5 shadow-[0_14px_36px_rgba(0,0,0,.18)] sm:p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blush/10 font-display text-xl text-blush ring-1 ring-blush/15">
          {partner ? String(partnerName).trim().charAt(0).toUpperCase() || 'P' : 'P'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.16em] text-roseGold">Call your partner</p>
          <p className="mt-0.5 truncate text-[15px] font-semibold text-white">{partner ? partnerName : 'Waiting for partner'}</p>
          {!partner ? (
            <p className="mt-1 text-[11px] leading-4 text-pink-100/48">
              {roomMemberCount > 2
                ? 'Private calling needs exactly two people in this universe.'
                : 'Share the couple code above so your partner can join.'}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-pink-100/45">Private audio or video call</p>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          disabled={!partner || busy}
          onClick={() => launch('audio')}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.045] px-3 text-sm font-medium text-pink-100 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Phone size={17} />
          Audio
        </button>

        <button
          type="button"
          disabled={!partner || busy}
          onClick={() => launch('video')}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blush to-roseGold px-3 text-sm font-semibold text-midnight transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Video size={17} />
          Video
        </button>
      </div>

      {busy ? <p className="mt-2 text-center text-[11px] text-pink-100/45">Call controls are active above the app.</p> : null}
      {error ? <p className="mt-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p> : null}
    </section>
  );
}
