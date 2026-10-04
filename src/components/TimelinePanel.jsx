import { motion } from 'framer-motion';
import { Cloud, ImagePlus, Mic, Plus, Trash2, UploadCloud, Video, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  deleteSharedMemory,
  loadDeviceMemories,
  moveDeviceMemoryToShared,
  removeDeviceMemory,
  saveSharedMemory,
  subscribeSharedMemories,
} from '../services/memoryService.js';
import { formatDate } from '../utils/date.js';

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  title: '',
  note: '',
  mediaType: 'image',
  mediaUrl: '',
  mediaFileName: '',
};

export default function TimelinePanel() {
  const { coupleId, user } = useAuth();
  const [sharedMemories, setSharedMemories] = useState([]);
  const [deviceMemories, setDeviceMemories] = useState(() => loadDeviceMemories());
  const [form, setForm] = useState(emptyForm);
  const [editorOpen, setEditorOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setStatus('');
    return subscribeSharedMemories(
      coupleId,
      setSharedMemories,
      () => setStatus('Shared memories could not be refreshed. Your device memories are still available.'),
    );
  }, [coupleId]);

  const memories = useMemo(() => {
    const combined = [...sharedMemories, ...deviceMemories];
    return combined
      .filter((memory) => {
        if (filter === 'all') return true;
        if (filter === 'note') return !memory.mediaUrl || memory.mediaType === 'note';
        return memory.mediaType === filter;
      })
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [sharedMemories, deviceMemories, filter]);

  async function addMemory(event) {
    event.preventDefault();
    if (!form.date || !form.title.trim() || busy) return;
    setBusy(true);
    setStatus('');
    try {
      await saveSharedMemory({ coupleId, user, memory: form, file });
      setEditorOpen(false);
      setFile(null);
      setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
      setStatus('Memory added to your shared universe.');
    } catch (error) {
      setStatus(error?.message || 'Unable to add this memory.');
    } finally {
      setBusy(false);
    }
  }

  async function moveToShared(memory) {
    if (busy) return;
    setBusy(true);
    setStatus('');
    try {
      await moveDeviceMemoryToShared({ coupleId, user, memory });
      setDeviceMemories(loadDeviceMemories());
      setStatus('Memory moved into your shared universe.');
    } catch (error) {
      setStatus(error?.message || 'Unable to move this memory yet.');
    } finally {
      setBusy(false);
    }
  }

  async function removeMemory(memory) {
    if (!window.confirm('Remove this memory?')) return;
    if (memory.origin === 'shared') {
      await deleteSharedMemory(coupleId, memory);
      return;
    }
    removeDeviceMemory(memory.id);
    setDeviceMemories(loadDeviceMemories());
  }

  return (
    <section id="timeline" className="glass rounded-3xl p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-roseGold">Shared memories</p>
          <p className="mt-1 text-sm text-pink-100/60">New memories sync between both partners. Older device-only memories stay visible until you choose to move them.</p>
        </div>
        <button
          type="button"
          onClick={() => setEditorOpen(true)}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-5 py-2 text-sm font-semibold text-midnight transition hover:brightness-105"
        >
          <Plus size={16} />
          Add memory
        </button>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {[
          ['all', 'All'],
          ['image', 'Photos'],
          ['video', 'Videos'],
          ['voice', 'Voice'],
          ['note', 'Notes'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`min-h-9 shrink-0 rounded-full px-4 text-xs transition ${
              filter === value ? 'bg-blush/18 text-white ring-1 ring-blush/35' : 'bg-white/[0.04] text-pink-100/60 hover:bg-white/[0.08]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {status ? <p className="mt-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-2 text-xs text-pink-100/65">{status}</p> : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {!memories.length ? (
          <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-white/12 bg-black/25 px-5 py-10 text-center">
            <p className="font-display text-2xl text-white">No memories here yet.</p>
            <p className="mt-2 text-sm text-pink-100/55">Add the first moment you want both of you to keep.</p>
          </div>
        ) : null}

        {memories.map((memory, index) => (
          <MemoryCard
            key={`${memory.origin}-${memory.id}`}
            memory={memory}
            index={index}
            busy={busy}
            onMove={() => moveToShared(memory)}
            onRemove={() => removeMemory(memory)}
          />
        ))}
      </div>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 px-0 backdrop-blur-sm sm:items-center sm:px-4">
          <motion.form
            onSubmit={addMemory}
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="glass max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl p-5 sm:rounded-3xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-roseGold">New memory</p>
                <h3 className="mt-1 font-display text-3xl text-white">Keep this moment together.</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-pink-100/65 transition hover:text-white"
                aria-label="Close memory editor"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-pink-100/60">
                Date
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((previous) => ({ ...previous, date: event.target.value }))}
                  className="mt-1.5 min-h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-3 text-sm text-pink-100 outline-none focus:border-blush/60"
                  required
                />
              </label>
              <label className="text-xs text-pink-100/60">
                Title
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
                  placeholder="What happened?"
                  className="mt-1.5 min-h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-3 text-sm text-pink-100 outline-none focus:border-blush/60"
                  required
                />
              </label>
            </div>

            <label className="mt-3 block text-xs text-pink-100/60">
              Photo, video, or voice memory
              <span className="mt-1.5 flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-black/30 px-4 text-sm text-pink-100/65 transition hover:border-blush/50">
                <span className="inline-flex items-center gap-1.5 text-roseGold"><ImagePlus size={16} /><Video size={16} /><Mic size={16} /></span>
                <span className="min-w-0 flex-1 truncate">{file?.name || 'Choose a file (max 25 MB)'}</span>
                <UploadCloud size={16} className="text-blush" />
              </span>
              <input
                type="file"
                accept="image/*,video/*,audio/*"
                className="hidden"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] || null;
                  setFile(nextFile);
                  if (nextFile) {
                    const type = nextFile.type.startsWith('video/') ? 'video' : nextFile.type.startsWith('audio/') ? 'voice' : 'image';
                    setForm((previous) => ({ ...previous, mediaType: type, mediaFileName: nextFile.name }));
                  }
                }}
              />
            </label>

            <details className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <summary className="cursor-pointer text-xs text-pink-100/60">Use a media link instead</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-[.35fr_.65fr]">
                <select
                  value={form.mediaType}
                  onChange={(event) => setForm((previous) => ({ ...previous, mediaType: event.target.value }))}
                  className="min-h-11 rounded-2xl border border-white/10 bg-black/35 px-3 text-sm text-pink-100 outline-none"
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="voice">Voice</option>
                  <option value="note">Note only</option>
                </select>
                <input
                  type="url"
                  value={form.mediaUrl}
                  onChange={(event) => setForm((previous) => ({ ...previous, mediaUrl: event.target.value }))}
                  placeholder="https://…"
                  className="min-h-11 rounded-2xl border border-white/10 bg-black/35 px-3 text-sm text-pink-100 outline-none focus:border-blush/60"
                />
              </div>
            </details>

            <label className="mt-3 block text-xs text-pink-100/60">
              Note <span className="text-pink-100/35">(optional)</span>
              <textarea
                value={form.note}
                onChange={(event) => setForm((previous) => ({ ...previous, note: event.target.value }))}
                placeholder="What do you want to remember about it?"
                rows={4}
                className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/35 px-3 py-3 text-sm text-pink-100 outline-none focus:border-blush/60"
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-5 text-sm font-semibold text-midnight transition hover:brightness-105 disabled:opacity-55"
            >
              <Cloud size={16} />
              {busy ? 'Saving…' : 'Save to our memories'}
            </button>
          </motion.form>
        </div>
      ) : null}
    </section>
  );
}

function MemoryCard({ memory, index, busy, onMove, onRemove }) {
  const local = memory.origin === 'device';
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.2) }}
      viewport={{ once: true }}
      className="group overflow-hidden rounded-2xl border border-white/10 bg-black/35 text-pink-100"
    >
      <div className="aspect-[4/3] bg-black/35">
        {memory.mediaUrl ? (
          memory.mediaType === 'video' ? (
            <video controls preload="metadata" src={memory.mediaUrl} className="h-full w-full object-cover" />
          ) : memory.mediaType === 'voice' ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
              <Mic size={32} className="text-roseGold" />
              <audio controls className="w-full" src={memory.mediaUrl} />
            </div>
          ) : (
            <img src={memory.mediaUrl} alt={memory.title} className="h-full w-full object-cover" loading="lazy" />
          )
        ) : (
          <div className="grid h-full place-items-center px-5 text-center text-sm leading-6 text-pink-100/65">
            {memory.note || 'A text memory'}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.16em] text-roseGold">{formatDate(memory.date)}</p>
          <span className={`rounded-full px-2 py-1 text-[10px] ${local ? 'bg-white/[0.06] text-pink-100/48' : 'bg-emerald-300/10 text-emerald-200'}`}>
            {local ? 'This device' : 'Shared'}
          </span>
        </div>
        <h3 className="mt-1 font-display text-2xl text-white">{memory.title}</h3>
        {memory.note && memory.mediaUrl ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-pink-100/70">{memory.note}</p> : null}
        {memory.createdByName && !local ? <p className="mt-3 text-[11px] text-pink-100/40">Added by {memory.createdByName}</p> : null}

        <div className="mt-4 flex items-center gap-2 border-t border-white/8 pt-3">
          {local ? (
            <button
              type="button"
              onClick={onMove}
              disabled={busy}
              className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-full bg-blush/12 px-3 text-xs font-medium text-blush transition hover:bg-blush/18 disabled:opacity-50"
            >
              <UploadCloud size={13} />
              Move to shared
            </button>
          ) : <span className="flex-1" />}
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-pink-100/38 transition hover:bg-red-300/10 hover:text-red-200"
            aria-label="Remove memory"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.article>
  );
}
