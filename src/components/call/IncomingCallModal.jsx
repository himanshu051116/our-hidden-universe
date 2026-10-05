import { Mic, Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from '../../calls/CallContext.jsx';

export default function IncomingCallModal() {
  const { call, incomingCall, partner, answerCall, declineCall } = useCall();

  if (!incomingCall || call.status !== 'incoming-ringing') return null;

  const audioOnly = incomingCall.type === 'audio';
  const partnerName = partner?.displayName || partner?.email || 'Your partner';
  const Icon = audioOnly ? Mic : Video;

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/80 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="incoming-call-title"
    >
      <div className="glass w-full max-w-sm rounded-3xl p-6 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-blush/15 text-blush">
          <Icon size={28} />
        </div>
        <p className="mt-5 text-xs uppercase tracking-[0.2em] text-roseGold">Incoming call</p>
        <h2 id="incoming-call-title" className="mt-2 font-display text-3xl text-white">
          {partnerName} is calling
        </h2>
        <p className="mt-2 text-sm text-pink-100/70">
          {audioOnly ? 'Audio call' : 'Video call'}
        </p>
        <p className="mt-2 text-xs leading-5 text-pink-100/45">
          Your browser may ask for {audioOnly ? 'microphone' : 'camera and microphone'} permission when you answer.
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
