import { AnimatePresence, motion } from 'framer-motion';
import {
  ExternalLink,
  FileHeart,
  Music2,
  Pencil,
  PlayCircle,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { openWhenTemplates } from '../data/demoData.js';
import { deleteOpenWhen, saveOpenWhen, subscribeOpenWhen } from '../services/coupleDashboardService.js';
import { firebaseEnabled } from '../services/firebase.js';
import SectionTitle from './SectionTitle.jsx';

function isSafeWebUrl(value) {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function sortSavedItems(items) {
  return [...items].sort((a, b) => {
    const left = new Date(a.createdAt || 0).getTime() || 0;
    const right = new Date(b.createdAt || 0).getTime() || 0;
    return left - right;
  });
}

function emptyDraft(item = {}) {
  return {
    id: item.id || crypto.randomUUID(),
    title: item.title || '',
    message: item.message || '',
    musicUrl: item.musicUrl || '',
    videoUrl: item.videoUrl || '',
    createdAt: item.createdAt || '',
  };
}

export default function OpenWhenPanel() {
  const { user, coupleId } = useAuth();
  const [saved, setSaved] = useState([]);
  const [active, setActive] = useState(null);
  const [editor, setEditor] = useState(null);
  const [status, setStatus] = useState(firebaseEnabled ? 'Connecting…' : 'Saved on this device');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(firebaseEnabled ? 'Connecting…' : 'Saved on this device');
    const unsubscribe = subscribeOpenWhen(
      coupleId,
      (items) => {
        setSaved(sortSavedItems(items));
        setStatus(firebaseEnabled ? 'Synced' : 'Saved on this device');
        setNotice('');
      },
      () => {
        setStatus('Sync unavailable');
        setNotice('Open When could not sync. Check your connection and try again.');
      },
    );
    return () => unsubscribe?.();
  }, [coupleId]);

  const cards = useMemo(() => {
    const savedById = new Map(saved.map((item) => [item.id, item]));
    const templates = openWhenTemplates.map((template) => ({
      ...template,
      ...savedById.get(template.id),
      id: template.id,
      template: true,
    }));
    const templateIds = new Set(openWhenTemplates.map((item) => item.id));
    const custom = saved.filter((item) => !templateIds.has(item.id)).map((item) => ({ ...item, template: false }));
    return [...templates, ...custom];
  }, [saved]);

  function openEditor(item) {
    setNotice('');
    setEditor(emptyDraft(item));
    setActive(null);
  }

  async function submitEditor(event) {
    event.preventDefault();
    if (!editor) return;

    const title = editor.title.trim();
    const message = editor.message.trim();
    if (!title) {
      setNotice('Give this Open When letter a title.');
      return;
    }
    if (!message) {
      setNotice('Write a message before saving this letter.');
      return;
    }
    if (!isSafeWebUrl(editor.musicUrl) || !isSafeWebUrl(editor.videoUrl)) {
      setNotice('Music and video links must start with http:// or https://.');
      return;
    }

    setSaving(true);
    setNotice('');
    setStatus(firebaseEnabled ? 'Saving…' : 'Saving…');
    try {
      await saveOpenWhen(coupleId, user, { ...editor, title, message });
      if (!firebaseEnabled) {
        setSaved((current) => sortSavedItems([
          ...current.filter((item) => item.id !== editor.id),
          { ...editor, title, message, createdAt: editor.createdAt || new Date().toISOString() },
        ]));
      }
      setEditor(null);
      setStatus(firebaseEnabled ? 'Synced' : 'Saved on this device');
    } catch {
      setStatus('Sync unavailable');
      setNotice('This letter could not be saved. Your draft is still here.');
    } finally {
      setSaving(false);
    }
  }

  async function removeLetter(item) {
    if (!item?.id || !item.message) return;
    const confirmed = window.confirm(`Delete “${item.title}” for both of you?`);
    if (!confirmed) return;

    setStatus(firebaseEnabled ? 'Saving…' : 'Saving…');
    setNotice('');
    try {
      await deleteOpenWhen(coupleId, item.id);
      setSaved((current) => current.filter((entry) => entry.id !== item.id));
      if (active?.id === item.id) setActive(null);
      if (editor?.id === item.id) setEditor(null);
      setStatus(firebaseEnabled ? 'Synced' : 'Saved on this device');
    } catch {
      setStatus('Sync unavailable');
      setNotice('This letter could not be deleted. Try again.');
    }
  }

  return (
    <section id="open-when" className="glass rounded-3xl p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle
          overline="Open When"
          title="A shared vault for the moments that matter"
          subtitle="Write a note once, keep it synced for both of you, and open it whenever that moment arrives."
        />
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] ${status === 'Synced' ? 'border-emerald-300/20 bg-emerald-300/8 text-emerald-200' : status === 'Sync unavailable' ? 'border-amber-300/20 bg-amber-300/8 text-amber-100' : 'border-white/10 bg-white/[0.035] text-pink-100/55'}`}>
            {status}
          </span>
          <button
            type="button"
            onClick={() => openEditor()}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-gradient-to-r from-blush to-roseGold px-4 text-xs font-semibold text-midnight transition hover:brightness-105"
          >
            <Plus size={14} />
            New letter
          </button>
        </div>
      </div>

      {notice && !editor ? (
        <div className="mb-4 rounded-xl border border-amber-300/15 bg-amber-300/8 px-3 py-2 text-xs text-amber-100/85">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((item) => {
          const ready = Boolean(item.message?.trim());
          return (
            <article
              key={item.id}
              className={`rounded-2xl border p-4 transition ${ready ? 'border-blush/20 bg-[linear-gradient(145deg,rgba(244,174,190,.09),rgba(0,0,0,.28))]' : 'border-white/10 bg-black/30'}`}
            >
              <div className="flex items-start gap-3">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${ready ? 'bg-blush/10 text-blush' : 'bg-white/[0.04] text-pink-100/45'}`}>
                  <FileHeart size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xl leading-tight text-white">{item.title}</p>
                  <p className="mt-1 text-[11px] text-pink-100/48">
                    {ready ? 'Ready whenever you need it' : 'Not written yet'}
                  </p>
                </div>
              </div>

              {ready ? (
                <p className="mt-3 line-clamp-2 text-sm leading-5 text-pink-100/72">{item.message}</p>
              ) : (
                <p className="mt-3 text-sm leading-5 text-pink-100/52">Turn this prompt into a private shared letter.</p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {ready ? (
                  <button
                    type="button"
                    onClick={() => setActive(item)}
                    className="rounded-full bg-blush/12 px-3.5 py-2 text-[11px] font-medium text-blush transition hover:bg-blush/18"
                  >
                    Open
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => openEditor(item)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-2 text-[11px] text-pink-100/70 transition hover:border-blush/25 hover:text-blush"
                >
                  <Pencil size={12} />
                  {ready ? 'Edit' : 'Write'}
                </button>
                {ready ? (
                  <button
                    type="button"
                    onClick={() => removeLetter(item)}
                    className="ml-auto grid h-9 w-9 place-items-center rounded-full text-pink-100/35 transition hover:bg-red-500/10 hover:text-red-200"
                    aria-label={`Delete ${item.title}`}
                  >
                    <Trash2 size={13} />
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <AnimatePresence>
        {active ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-black/78 px-3 py-6 backdrop-blur-sm sm:grid sm:place-items-center sm:px-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setActive(null);
            }}
          >
            <motion.article
              initial={{ y: 20, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 14, scale: 0.98 }}
              className="glass relative mx-auto w-full max-w-xl rounded-[1.8rem] p-5 sm:p-7"
            >
              <button
                type="button"
                onClick={() => setActive(null)}
                className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/25 text-pink-100/70 transition hover:text-white"
                aria-label="Close letter"
              >
                <X size={15} />
              </button>

              <div className="pr-11">
                <p className="text-[10px] uppercase tracking-[0.22em] text-roseGold">Open When</p>
                <h3 className="mt-1 font-display text-3xl leading-tight text-white sm:text-4xl">{active.title}</h3>
              </div>

              <div className="mt-6 rounded-2xl border border-white/8 bg-black/24 p-4 sm:p-5">
                <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-pink-50/90">{active.message}</p>
              </div>

              {(active.musicUrl || active.videoUrl) ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {active.musicUrl ? (
                    <a
                      href={active.musicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm text-pink-100 transition hover:border-blush/30 hover:text-blush"
                    >
                      <Music2 size={15} />
                      Music
                      <ExternalLink size={12} className="ml-auto opacity-50" />
                    </a>
                  ) : null}
                  {active.videoUrl ? (
                    <a
                      href={active.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm text-pink-100 transition hover:border-blush/30 hover:text-blush"
                    >
                      <PlayCircle size={15} />
                      Video
                      <ExternalLink size={12} className="ml-auto opacity-50" />
                    </a>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-[10px] text-pink-100/35">
                  <Sparkles size={12} />
                  Shared privately in your universe
                </span>
                <button
                  type="button"
                  onClick={() => openEditor(active)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/10 px-3 text-[11px] text-pink-100/65 hover:border-blush/25 hover:text-blush"
                >
                  <Pencil size={12} /> Edit
                </button>
              </div>
            </motion.article>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {editor ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] overflow-y-auto bg-black/82 px-3 py-5 backdrop-blur-sm sm:grid sm:place-items-center sm:px-4"
          >
            <motion.form
              onSubmit={submitEditor}
              initial={{ y: 20, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 14, scale: 0.98 }}
              className="glass relative mx-auto w-full max-w-2xl rounded-[1.8rem] p-4 sm:p-6"
            >
              <button
                type="button"
                onClick={() => {
                  setEditor(null);
                  setNotice('');
                }}
                className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/25 text-pink-100/70"
                aria-label="Close editor"
              >
                <X size={15} />
              </button>

              <div className="pr-11">
                <p className="text-[10px] uppercase tracking-[0.22em] text-roseGold">Write together</p>
                <h3 className="mt-1 font-display text-3xl text-white">Open When letter</h3>
                <p className="mt-1 text-xs leading-5 text-pink-100/50">Your partner sees the saved version on their device automatically.</p>
              </div>

              <div className="mt-5 grid gap-3">
                <label className="grid gap-1.5 text-[11px] text-pink-100/58">
                  Moment
                  <input
                    value={editor.title}
                    onChange={(event) => setEditor((current) => ({ ...current, title: event.target.value }))}
                    maxLength={100}
                    placeholder="Open when…"
                    className="min-h-11 rounded-xl border border-white/10 bg-black/32 px-3 text-sm text-white outline-none focus:border-blush/45"
                  />
                </label>

                <label className="grid gap-1.5 text-[11px] text-pink-100/58">
                  Message
                  <textarea
                    value={editor.message}
                    onChange={(event) => setEditor((current) => ({ ...current, message: event.target.value }))}
                    maxLength={4000}
                    rows={9}
                    placeholder="Write what you want your partner to read in this moment…"
                    className="resize-y rounded-xl border border-white/10 bg-black/32 px-3 py-3 text-sm leading-6 text-white outline-none focus:border-blush/45"
                  />
                  <span className="justify-self-end text-[9px] text-pink-100/30">{editor.message.length}/4000</span>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-[11px] text-pink-100/58">
                    Music link · optional
                    <input
                      value={editor.musicUrl}
                      onChange={(event) => setEditor((current) => ({ ...current, musicUrl: event.target.value }))}
                      inputMode="url"
                      placeholder="https://…"
                      className="min-h-11 rounded-xl border border-white/10 bg-black/32 px-3 text-sm text-white outline-none focus:border-blush/45"
                    />
                  </label>
                  <label className="grid gap-1.5 text-[11px] text-pink-100/58">
                    Video link · optional
                    <input
                      value={editor.videoUrl}
                      onChange={(event) => setEditor((current) => ({ ...current, videoUrl: event.target.value }))}
                      inputMode="url"
                      placeholder="https://…"
                      className="min-h-11 rounded-xl border border-white/10 bg-black/32 px-3 text-sm text-white outline-none focus:border-blush/45"
                    />
                  </label>
                </div>
              </div>

              {notice ? (
                <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/8 px-3 py-2 text-xs text-amber-100/85">
                  {notice}
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditor(null);
                    setNotice('');
                  }}
                  className="min-h-10 rounded-full border border-white/10 px-4 text-xs text-pink-100/65"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-gradient-to-r from-blush to-roseGold px-5 text-xs font-semibold text-midnight transition hover:brightness-105 disabled:opacity-50"
                >
                  <Save size={13} />
                  {saving ? 'Saving…' : 'Save letter'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
