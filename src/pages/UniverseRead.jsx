import { ArrowLeft, BookOpen, CheckCheck, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { loadLocalReadTogether, saveReadTogether, subscribeReadTogether } from '../services/coupleDashboardService.js';

export default function UniverseRead() {
  const { coupleId, user } = useAuth();
  const [state, setState] = useState(() => loadLocalReadTogether());
  const [partner, setPartner] = useState({ chapter: '', page: '', displayName: 'Partner' });
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeReadTogether(coupleId, (next) => {
      const self = next.progressByUser?.[user?.uid] || {};
      const partnerEntry = Object.entries(next.progressByUser || {}).find(([uid]) => uid !== user?.uid)?.[1] || {};
      setState((previous) => ({
        ...previous,
        title: next.title || '',
        link: next.link || '',
        selfChapter: self.chapter || '',
        selfPage: self.page || '',
      }));
      setPartner({
        chapter: partnerEntry.chapter || '',
        page: partnerEntry.page || '',
        displayName: partnerEntry.displayName || 'Partner',
      });
    });
    return () => unsubscribe?.();
  }, [coupleId, user?.uid]);

  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus('');
    try {
      await saveReadTogether(coupleId, user, state);
      setStatus('Your reading spot is shared.');
    } catch {
      setStatus('We could not save your reading spot. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="px-1 sm:px-0">
        <Link to="/universe/together" className="inline-flex min-h-10 items-center gap-2 rounded-full px-1 text-xs text-pink-100/60 transition hover:text-white">
          <ArrowLeft size={15} />
          Together
        </Link>
        <p className="mt-1 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-roseGold">
          <BookOpen size={14} />
          Read Together
        </p>
        <h2 className="mt-1 font-display text-3xl text-white sm:text-4xl">Keep your place without keeping score.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-pink-100/60">Save where you are, see where your partner is, and continue when you are ready.</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <form onSubmit={save} className="glass rounded-3xl p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2 text-xs text-pink-100/60">
              Book, manga, article, or topic
              <input
                value={state.title || ''}
                onChange={(event) => setState((previous) => ({ ...previous, title: event.target.value }))}
                placeholder="What are you reading?"
                className="mt-1.5 min-h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-pink-100 outline-none focus:border-blush/60"
              />
            </label>

            <label className="text-xs text-pink-100/60">
              My chapter
              <input
                value={state.selfChapter || ''}
                onChange={(event) => setState((previous) => ({ ...previous, selfChapter: event.target.value }))}
                placeholder="Chapter 42"
                className="mt-1.5 min-h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-pink-100 outline-none focus:border-blush/60"
              />
            </label>

            <label className="text-xs text-pink-100/60">
              My page
              <input
                value={state.selfPage || ''}
                onChange={(event) => setState((previous) => ({ ...previous, selfPage: event.target.value }))}
                placeholder="Page 18"
                className="mt-1.5 min-h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-pink-100 outline-none focus:border-blush/60"
              />
            </label>

            <label className="sm:col-span-2 text-xs text-pink-100/60">
              Reading link <span className="text-pink-100/35">(optional)</span>
              <input
                type="url"
                value={state.link || ''}
                onChange={(event) => setState((previous) => ({ ...previous, link: event.target.value }))}
                placeholder="https://…"
                className="mt-1.5 min-h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-pink-100 outline-none focus:border-blush/60"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-5 text-sm font-semibold text-midnight transition hover:brightness-105 disabled:opacity-55"
            >
              <CheckCheck size={15} />
              {busy ? 'Saving…' : 'Update my spot'}
            </button>
            {state.link ? (
              <a
                href={state.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 px-4 text-xs text-pink-100/70 transition hover:border-blush/45 hover:text-white"
              >
                <ExternalLink size={14} />
                Open reading link
              </a>
            ) : null}
          </div>
          {status ? <p className="mt-3 text-xs text-pink-100/60">{status}</p> : null}
        </form>

        <aside className="glass rounded-3xl p-4 sm:p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-roseGold">Side by side</p>
          <h3 className="mt-2 font-display text-2xl text-white">{state.title || 'Choose something to read together'}</h3>

          <div className="mt-5 space-y-3">
            <ProgressRow label="You" chapter={state.selfChapter} page={state.selfPage} active />
            <ProgressRow label={partner.displayName || 'Partner'} chapter={partner.chapter} page={partner.page} />
          </div>
        </aside>
      </section>
    </div>
  );
}

function ProgressRow({ label, chapter, page, active = false }) {
  const value = [chapter, page].filter(Boolean).join(' · ');
  return (
    <div className={`rounded-2xl border px-4 py-4 ${active ? 'border-blush/25 bg-blush/[0.06]' : 'border-white/10 bg-black/25'}`}>
      <p className="text-xs uppercase tracking-[0.15em] text-pink-100/45">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value || 'No saved spot yet'}</p>
    </div>
  );
}
