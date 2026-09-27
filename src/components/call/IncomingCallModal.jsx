import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from '../../calls/CallContext.jsx';

export default function IncomingCallModal() {
  const { call, incomingCall, answerCall, declineCall } = useCall();

  if (!incomingCall || call.status !== 'incoming-ringing') return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 px-4 backdrop-blur-sm">
      <div className="glass w-full max-w-sm rounded-3xl p-6 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-blush/15 text-blush">
          <Video size={28} />
        </div>
        <p className="mt-5 text-xs uppercase tracking-[0.2em] text-roseGold">Incoming call</p>
        <h2 className="mt-2 font-display text-3xl text-white">
          Your partner is calling
        </h2>
        <p className="mt-2 text-sm text-pink-100/70">
          {incomingCall.type === 'audio' ? 'Audio call' : 'Video call'}
        </p>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={declineCall}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-red-300/30 bg-red-500/10 text-sm text-red-200"
          >
            <PhoneOff size={17} />
            Decline
          </button>
          <button
            type="button"
            onClick={answerCall}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold text-sm font-semibold text-midnight"
          >
            <Phone size={17} />
            Answer
          </button>
        </div>
      </div>
    </div>
  );
}
