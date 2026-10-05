import { Mic, Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from '../../calls/CallContext.jsx';

export default function IncomingCallModal() {
  const { call, incomingCall, partner, answerCall, declineCall } = useCall();

  if (!incomingCall || call.status !== 'incoming-ringing') return null;

  const audioOnly = incomingCall.type === 'audio';
  const partnerName = partner?.displayName || partner?.email || 'Your partner';
  const initial = String(partnerName).trim().charAt(0).toUpperCase() || 'P';
  const Icon = audioOnly ? Mic : Video;

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-[radial-gradient(circle_at_center,rgba(255,182,200,.12),transparent_26rem),rgba(1,2,7,.96)] px-4 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] backdrop-blur-xl sm:bg-black/82"
      role="dialog"
      aria-modal="true"
      aria-labelledby="incoming-call-title"
    >
      <div className="flex min-h-[78vh] w-full max-w-sm flex-col items-center justify-between rounded-[2rem] border border-white/0 px-3 py-10 text-center sm:min-h-0 sm:border-white/10 sm:bg-midnight/88 sm:p-7 sm:shadow-2xl">
        <div className="w-full">
          <p className="text-[10px] uppercase tracking-[0.22em] text-roseGold">Incoming {audioOnly ? 'audio' : 'video'} call</p>

          <div className="relative mx-auto mt-10 grid h-28 w-28 place-items-center rounded-full bg-blush/10 font-display text-5xl text-blush ring-1 ring-blush/20 sm:mt-7 sm:h-24 sm:w-24 sm:text-4xl">
            <span className="absolute inset-[-10px] animate-pulse rounded-full border border-blush/12" />
            <span className="absolute inset-[-20px] rounded-full border border-blush/[0.06]" />
            {initial}
          </div>

          <h2 id="incoming-call-title" className="mt-7 font-display text-4xl leading-tight text-white sm:text-3xl">
            {partnerName}
          </h2>
          <p className="mt-2 text-sm text-pink-100/58">is calling you on Our Hidden Universe</p>

          <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[11px] text-pink-100/60">
            <Icon size={13} />
            {audioOnly ? 'Microphone access is used when you answer' : 'Camera and microphone are used when you answer'}
          </div>
        </div>

        <div className="mt-10 flex w-full items-end justify-center gap-14 sm:mt-8 sm:gap-10">
          <div className="text-center">
            <button
              type="button"
              onClick={declineCall}
              className="grid h-16 w-16 place-items-center rounded-full bg-red-500/90 text-white shadow-[0_12px_36px_rgba(239,68,68,.25)] transition active:scale-95"
              aria-label="Decline call"
            >
              <PhoneOff size={24} />
            </button>
            <p className="mt-2 text-[11px] text-pink-100/48">Decline</p>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={answerCall}
              className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-blush to-roseGold text-midnight shadow-[0_12px_38px_rgba(244,174,190,.25)] transition active:scale-95"
              aria-label="Answer call"
            >
              <Phone size={24} />
            </button>
            <p className="mt-2 text-[11px] text-pink-100/60">Answer</p>
          </div>
        </div>
      </div>
    </div>
  );
}
