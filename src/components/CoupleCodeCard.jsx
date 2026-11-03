import { Check, Copy, HeartHandshake, Share2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/authContextBase.jsx';

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Installed PWAs and some mobile browsers may reject Clipboard API.
  }

  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  try {
    return Boolean(document.execCommand('copy'));
  } finally {
    field.remove();
  }
}

/**
 * Share a previously created room code. Never generate another code on render:
 * both partners must keep using the same Firestore room identifier.
 */
export default function CoupleCodeCard({ isNew = false, compact = false }) {
  const { user, coupleCodeDisplay } = useAuth();
  const [message, setMessage] = useState('');

  if (!user || !coupleCodeDisplay) return null;

  async function copyCode() {
    try {
      const copied = await copyText(coupleCodeDisplay);
      setMessage(copied ? 'Code copied — send it to your partner.' : 'Copy was blocked. Select the code to copy it.');
    } catch {
      setMessage('Copy was blocked. Select the code to copy it.');
    }
  }

  async function shareCode() {
    const joinUrl = new URL('/login?mode=login', window.location.origin).toString();
    const invitation = `Join me in Our Hidden Universe! Use couple code ${coupleCodeDisplay} at ${joinUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join our universe', text: invitation });
        setMessage('Invitation shared.');
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }

    try {
      const copied = await copyText(invitation);
      setMessage(copied ? 'Invitation copied — send it to your partner.' : 'Sharing unavailable. Copy the code instead.');
    } catch {
      setMessage('Sharing unavailable. Copy the code instead.');
    }
  }

  return (
    <section
      aria-label="Your couple invitation"
      className={'relative overflow-hidden rounded-[26px] border border-blush/30 bg-[radial-gradient(circle_at_90%_0%,rgba(244,174,190,.15),transparent_52%),linear-gradient(145deg,rgba(49,29,55,.92),rgba(14,12,28,.95))] shadow-[0_18px_45px_rgba(0,0,0,.18)] ' +
        (compact ? 'mt-5 p-4 sm:p-5' : 'p-4 sm:p-6')}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-blush/30 bg-blush/10 text-blush">
          <HeartHandshake size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-roseGold">
            {isNew ? 'Your universe is ready' : 'Invite your person'}
          </p>
          <h2 className="mt-1 font-display text-2xl leading-tight text-white sm:text-3xl">
            {isNew ? 'Share the code to get together.' : 'Your couple code'}
          </h2>
          <p className="mt-1 text-xs leading-5 text-pink-100/65">
            {isNew ? 'Your space was created successfully. This code lets your partner join it.' :
              'Use this same code when your partner joins your private space.'}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-pink-100/50">Couple code</p>
          <output aria-label="Your couple code" className="mt-1 block select-all break-all font-mono text-xl font-bold tracking-[.13em] text-white sm:text-2xl">{coupleCodeDisplay}</output>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={copyCode} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-blush/35 px-4 text-sm font-semibold text-blush transition hover:bg-blush/10 sm:flex-none">
            <Copy size={15} aria-hidden="true" /> Copy
          </button>
          <button type="button" onClick={shareCode} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-blush px-4 text-sm font-semibold text-midnight transition hover:brightness-110 sm:flex-none">
            <Share2 size={15} aria-hidden="true" /> Share
          </button>
        </div>
      </div>
      <p className="mt-3 inline-flex items-start gap-1.5 text-xs leading-5 text-pink-100/55">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-blush" aria-hidden="true" />
        Only share your code with the person you want to invite.
      </p>
      {message ? <p role="status" className="mt-2 inline-flex items-center gap-2 text-xs text-emerald-200"><Check size={14} aria-hidden="true" /> {message}</p> : null}
    </section>
  );
}
