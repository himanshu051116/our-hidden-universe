import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays,
  Cloud,
  ImagePlus,
  Maximize2,
  Mic,
  Pencil,
  Plus,
  Trash2,
  UploadCloud,
  UserRound,
  Video,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  deleteSharedMemory,
  loadDeviceMemories,
  moveDeviceMemoryToShared,
  removeDeviceMemory,
  saveSharedMemory,
  subscribeSharedMemories,
  updateSharedMemory,
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

async function prepareMemoryFile(file) {
  if (!file?.type?.startsWith('image/')) return file;
  if (file.type === 'image/gif' || file.size <= 1.2 * 1024 * 1024) return file;

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Unable to prepare this photo.'));
      element.src = sourceUrl;
    });

    const longest = Math.max(image.naturalWidth || 1, image.naturalHeight || 1);
    const scale = Math.min(1, 1800 / longest);
    const width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
    const height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error('Unable to prepare this photo.'))),
        'image/jpeg',
        0.84,
      );
    });
    const baseName = String(file.name || 'memory').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '-') || 'memory';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export default function TimelinePanel() {
  const { coupleId, user } = useAuth();
  const [sharedMemories, setSharedMemories] = useState([]);
  const [deviceMemories, setDeviceMemories] = useState(() => loadDeviceMemories());
  const [form, setForm] = useState(emptyForm);
  const [editorOpen, setEditorOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [filter, setFilter] = useState('all');
  const [viewer, setViewer] = useState(null);
  const [editing, setEditing] = useState(null);

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

  useEffect(() => {
    if (!viewer) return;
    const latest = [...sharedMemories, ...deviceMemories].find(
      (memory) => memory.id === viewer.id && memory.origin === viewer.origin,
    );
    if (!latest) setViewer(null);
    else if (latest !== viewer) setViewer(latest);
  }, [sharedMemories, deviceMemories, viewer]);

  async function addMemory(event) {
    event.preventDefault();
    if (!form.date || !form.title.trim() || busy) return;
    setBusy(true);
    setUploadProgress(0);
    setStatus('');
    try {
      const preparedFile = file ? await prepareMemoryFile(file) : null;
      await saveSharedMemory({
        coupleId,
        user,
        memory: form,
        file: preparedFile,
        onProgress: setUploadProgress,
      });
      setEditorOpen(false);
      setFile(null);
      setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
      setStatus('Memory added to your shared universe.');
    } catch (error) {
      setStatus(error?.message || 'Unable to add this memory.');
    } finally {
      setBusy(false);
      setUploadProgress(0);
    }
  }

  async function moveToShared(memory) {
    if (busy) return;
    setBusy(true);
    setUploadProgress(0);
    setStatus('');
    try {
      await moveDeviceMemoryToShared({ coupleId, user, memory, onProgress: setUploadProgress });
      setDeviceMemories(loadDeviceMemories());
      setViewer(null);
      setStatus('Memory moved into your shared universe.');
    } catch (error) {
      setStatus(error?.message || 'Unable to move this memory yet.');
    } finally {
      setBusy(false);
      setUploadProgress(0);
    }
  }

  async function removeMemory(memory) {
    if (!window.confirm('Remove this memory for both of you?')) return;
    try {
      if (memory.origin === 'shared') {
        await deleteSharedMemory(coupleId, memory);
      } else {
        removeDeviceMemory(memory.id);
        setDeviceMemories(loadDeviceMemories());
      }
      if (viewer?.id === memory.id) setViewer(null);
      setStatus('Memory removed.');
    } catch {
      setStatus('That memory could not be removed. Try again.');
    }
  }

  function openEdit(memory) {
    if (memory.origin !== 'shared') return;
    setEditing({
      id: memory.id,
      date: memory.date || '',
      title: memory.title || '',
      note: memory.note || '',
    });
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!editing || busy) return;
    setBusy(true);
    setStatus('');
    try {
      await updateSharedMemory(coupleId, editing.id, editing);
      setViewer((current) => current?.id === editing.id ? { ...current, ...editing } : current);
      setEditing(null);
      setStatus('Memory details updated.');
    } catch (error) {
      setStatus(error?.message || 'Unable to update this memory.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="timeline" className="glass rounded-3xl p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-roseGold">Shared memories</p>
          <h2 className="mt-1 font-display text-3xl text-white">Moments you keep together</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-pink-100/55">New memories sync between both partners. Older device-only memories stay visible until you choose to move them.</p>
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

      <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
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
        <span className="ml-auto shrink-0 rounded-full border border-white/8 bg-white/[0.025] px-3 py-1.5 text-[10px] text-pink-100/40">
          {sharedMemories.length} shared
        </span>
      </div>

      {status ? <p className="mt-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-2 text-xs text-pink-100/65">{status}</p> : null}

      {busy && uploadProgress > 0 ? (
        <div className="mt-3 rounded-2xl border border-blush/12 bg-blush/[0.045] px-4 py-3">
          <div className="flex items-center justify-between text-[10px] text-pink-100/55"><span>Uploading memory</span><span>{uploadProgress}%</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-blush to-roseGold transition-all" style={{ width: `${uploadProgress}%` }} /></div>
        </div>
      ) : null}

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
            onOpen={() => setViewer(memory)}
            onMove={() => moveToShared(memory)}
            onRemove={() => removeMemory(memory)}
          />
        ))}
      </div>

      <AnimatePresence>
        {viewer ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-black/88 px-3 py-4 backdrop-blur-md sm:grid sm:place-items-center sm:px-5"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setViewer(null);
            }}
          >
            <motion.article
              initial={{ y: 16, scale: 0.985 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 12, scale: 0.985 }}
              className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#0b080d] shadow-2xl"
            >
              <button type="button" onClick={() => setViewer(null)} className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur" aria-label="Close memory">
                <X size={17} />
              </button>

              <MemoryMedia memory={viewer} expanded />

              <div className="p-5 sm:p-7">
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-pink-100/48">
                  <span className="inline-flex items-center gap-1.5"><CalendarDays size={12} className="text-roseGold" />{formatDate(viewer.date)}</span>
                  <span>•</span>
                  <span className={`rounded-full px-2 py-1 ${viewer.origin === 'shared' ? 'bg-emerald-300/10 text-emerald-200' : 'bg-white/[0.06] text-pink-100/50'}`}>{viewer.origin === 'shared' ? 'Shared' : 'This device'}</span>
                </div>
                <h3 className="mt-2 font-display text-3xl leading-tight text-white sm:text-4xl">{viewer.title}</h3>
                {viewer.note ? <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-pink-50/78">{viewer.note}</p> : null}
                {viewer.createdByName && viewer.origin === 'shared' ? (
                  <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-pink-100/38"><UserRound size={12} />Added by {viewer.createdByName}</p>
                ) : null}

                <div className="mt-6 flex flex-wrap gap-2 border-t border-white/8 pt-4">
                  {viewer.origin === 'device' ? (
                    <button type="button" disabled={busy} onClick={() => moveToShared(viewer)} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-blush/12 px-4 text-xs font-medium text-blush disabled:opacity-50">
                      <UploadCloud size={13} /> Move to shared
                    </button>
                  ) : (
                    <button type="button" onClick={() => openEdit(viewer)} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/10 px-4 text-xs text-pink-100/68 hover:border-blush/25 hover:text-blush">
                      <Pencil size={13} /> Edit details
                    </button>
                  )}
                  <button type="button" onClick={() => removeMemory(viewer)} className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-xs text-red-200/65 hover:bg-red-500/10 hover:text-red-100">
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              </div>
            </motion.article>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {editing ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] overflow-y-auto bg-black/82 px-3 py-5 backdrop-blur-sm sm:grid sm:place-items-center sm:px-4">
            <motion.form onSubmit={saveEdit} initial={{ y: 18, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 12, scale: 0.98 }} className="glass relative mx-auto w-full max-w-xl rounded-[1.8rem] p-5 sm:p-6">
              <button type="button" onClick={() => setEditing(null)} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/10 text-pink-100/65" aria-label="Close memory editor"><X size={15} /></button>
              <p className="text-[10px] uppercase tracking-[0.2em] text-roseGold">Edit memory</p>
              <h3 className="mt-1 pr-12 font-display text-3xl text-white">Update the details</h3>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs text-pink-100/55">Date<input type="date" required value={editing.date} onChange={(event) => setEditing((current) => ({ ...current, date: event.target.value }))} className="min-h-11 rounded-2xl border border-white/10 bg-black/35 px-3 text-sm text-white outline-none focus:border-blush/50" /></label>
                <label className="grid gap-1.5 text-xs text-pink-100/55">Title<input required maxLength={120} value={editing.title} onChange={(event) => setEditing((current) => ({ ...current, title: event.target.value }))} className="min-h-11 rounded-2xl border border-white/10 bg-black/35 px-3 text-sm text-white outline-none focus:border-blush/50" /></label>
              </div>
              <label className="mt-3 grid gap-1.5 text-xs text-pink-100/55">Note<textarea rows={6} maxLength={4000} value={editing.note} onChange={(event) => setEditing((current) => ({ ...current, note: event.target.value }))} className="resize-y rounded-2xl border border-white/10 bg-black/35 px-3 py-3 text-sm leading-6 text-white outline-none focus:border-blush/50" /></label>
              <button type="submit" disabled={busy} className="mt-5 min-h-11 w-full rounded-full bg-gradient-to-r from-blush to-roseGold px-5 text-sm font-semibold text-midnight disabled:opacity-50">{busy ? 'Saving…' : 'Save changes'}</button>
            </motion.form>
          </motion.div>
        ) : null}
      </AnimatePresence>

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
              <button type="button" onClick={() => setEditorOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-pink-100/65 transition hover:text-white" aria-label="Close memory editor"><X size={17} /></button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-pink-100/60">Date<input type="date" value={form.date} onChange={(event) => setForm((previous) => ({ ...previous, date: event.target.value }))} className="mt-1.5 min-h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-3 text-sm text-pink-100 outline-none focus:border-blush/60" required /></label>
              <label className="text-xs text-pink-100/60">Title<input type="text" maxLength={120} value={form.title} onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))} placeholder="What happened?" className="mt-1.5 min-h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-3 text-sm text-pink-100 outline-none focus:border-blush/60" required /></label>
            </div>

            <label className="mt-3 block text-xs text-pink-100/60">
              Photo, video, or voice memory
              <span className="mt-1.5 flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-black/30 px-4 text-sm text-pink-100/65 transition hover:border-blush/50">
                <span className="inline-flex items-center gap-1.5 text-roseGold"><ImagePlus size={16} /><Video size={16} /><Mic size={16} /></span>
                <span className="min-w-0 flex-1 truncate">{file?.name || 'Choose a file (max 25 MB)'}</span>
                <UploadCloud size={16} className="text-blush" />
              </span>
              <input type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={(event) => {
                const nextFile = event.target.files?.[0] || null;
                setFile(nextFile);
                if (nextFile) {
                  const type = nextFile.type.startsWith('video/') ? 'video' : nextFile.type.startsWith('audio/') ? 'voice' : 'image';
                  setForm((previous) => ({ ...previous, mediaType: type, mediaFileName: nextFile.name }));
                }
              }} />
            </label>

            <details className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <summary className="cursor-pointer text-xs text-pink-100/60">Use a media link instead</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-[.35fr_.65fr]">
                <select value={form.mediaType} onChange={(event) => setForm((previous) => ({ ...previous, mediaType: event.target.value }))} className="min-h-11 rounded-2xl border border-white/10 bg-black/35 px-3 text-sm text-pink-100 outline-none">
                  <option value="image">Image</option><option value="video">Video</option><option value="voice">Voice</option><option value="note">Note only</option>
                </select>
                <input type="url" value={form.mediaUrl} onChange={(event) => setForm((previous) => ({ ...previous, mediaUrl: event.target.value }))} placeholder="https://…" className="min-h-11 rounded-2xl border border-white/10 bg-black/35 px-3 text-sm text-pink-100 outline-none focus:border-blush/60" />
              </div>
            </details>

            <label className="mt-3 block text-xs text-pink-100/60">Note <span className="text-pink-100/35">(optional)</span><textarea value={form.note} maxLength={4000} onChange={(event) => setForm((previous) => ({ ...previous, note: event.target.value }))} placeholder="What do you want to remember about it?" rows={4} className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/35 px-3 py-3 text-sm text-pink-100 outline-none focus:border-blush/60" /></label>

            {busy && uploadProgress > 0 ? (
              <div className="mt-4"><div className="flex justify-between text-[10px] text-pink-100/50"><span>Uploading</span><span>{uploadProgress}%</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-blush to-roseGold transition-all" style={{ width: `${uploadProgress}%` }} /></div></div>
            ) : null}

            <button type="submit" disabled={busy} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-5 text-sm font-semibold text-midnight transition hover:brightness-105 disabled:opacity-55">
              <Cloud size={16} />{busy ? (uploadProgress > 0 ? `Uploading ${uploadProgress}%` : 'Saving…') : 'Save to our memories'}
            </button>
          </motion.form>
        </div>
      ) : null}
    </section>
  );
}

function MemoryMedia({ memory, expanded = false }) {
  const sizeClass = expanded ? 'max-h-[68vh] min-h-[260px]' : 'h-full';
  if (!memory.mediaUrl) {
    return <div className={`${sizeClass} grid place-items-center bg-black/35 px-6 py-12 text-center text-sm leading-7 text-pink-100/65`}>{memory.note || 'A text memory'}</div>;
  }
  if (memory.mediaType === 'video') {
    return <video controls preload="metadata" src={memory.mediaUrl} className={`${sizeClass} w-full bg-black object-contain`} />;
  }
  if (memory.mediaType === 'voice') {
    return <div className={`${sizeClass} flex flex-col items-center justify-center gap-5 bg-black/35 px-6 py-12 text-center`}><Mic size={38} className="text-roseGold" /><audio controls className="w-full max-w-xl" src={memory.mediaUrl} /></div>;
  }
  return <img src={memory.mediaUrl} alt={memory.title} className={`${sizeClass} w-full bg-black object-contain`} loading={expanded ? 'eager' : 'lazy'} />;
}

function MemoryCard({ memory, index, busy, onOpen, onMove, onRemove }) {
  const local = memory.origin === 'device';
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.2) }}
      viewport={{ once: true }}
      onClick={onOpen}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-black/35 text-pink-100 transition hover:border-blush/20 hover:bg-black/42"
    >
      <div className="relative aspect-[4/3] bg-black/35">
        <MemoryMedia memory={memory} />
        <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/55 text-white/70 opacity-0 backdrop-blur transition group-hover:opacity-100"><Maximize2 size={13} /></span>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.16em] text-roseGold">{formatDate(memory.date)}</p>
          <span className={`rounded-full px-2 py-1 text-[10px] ${local ? 'bg-white/[0.06] text-pink-100/48' : 'bg-emerald-300/10 text-emerald-200'}`}>{local ? 'This device' : 'Shared'}</span>
        </div>
        <h3 className="mt-1 font-display text-2xl text-white">{memory.title}</h3>
        {memory.note && memory.mediaUrl ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-pink-100/70">{memory.note}</p> : null}
        {memory.createdByName && !local ? <p className="mt-3 text-[11px] text-pink-100/40">Added by {memory.createdByName}</p> : null}

        <div className="mt-4 flex items-center gap-2 border-t border-white/8 pt-3" onClick={(event) => event.stopPropagation()}>
          {local ? (
            <button type="button" onClick={onMove} disabled={busy} className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-full bg-blush/12 px-3 text-xs font-medium text-blush transition hover:bg-blush/18 disabled:opacity-50"><UploadCloud size={13} />Move to shared</button>
          ) : <button type="button" onClick={onOpen} className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-full bg-white/[0.035] px-3 text-xs text-pink-100/58 hover:bg-white/[0.06]"><Maximize2 size={13} />Open</button>}
          <button type="button" onClick={onRemove} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-pink-100/38 transition hover:bg-red-300/10 hover:text-red-200" aria-label="Remove memory"><Trash2 size={14} /></button>
        </div>
      </div>
    </motion.article>
  );
}
