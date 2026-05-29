import { motion } from 'framer-motion';
import { ImagePlus, Mic, Plus, Video } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { initialMemories } from '../data/demoData.js';
import { formatDate } from '../utils/date.js';
import SectionTitle from './SectionTitle.jsx';

const memoriesKey = 'ohu-memories-v1';

function loadMemories() {
  try {
    const raw = localStorage.getItem(memoriesKey);
    const parsed = raw ? JSON.parse(raw) : initialMemories;
    return Array.isArray(parsed) ? parsed : initialMemories;
  } catch {
    return initialMemories;
  }
}

function dataUrlFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result?.toString() || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function TimelinePanel() {
  const [memories, setMemories] = useState(() => loadMemories());
  const [form, setForm] = useState({
    date: '',
    title: '',
    note: '',
    mediaType: 'image',
    mediaUrl: '',
    mediaFileName: '',
  });

  const sorted = useMemo(
    () =>
      [...memories].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [memories],
  );

  useEffect(() => {
    localStorage.setItem(memoriesKey, JSON.stringify(memories));
  }, [memories]);

  async function addMemory(event) {
    event.preventDefault();
    if (!form.date || !form.title.trim()) return;
    const file = event.currentTarget.elements.mediaFile.files?.[0];
    const uploadedMediaUrl = file ? await dataUrlFromFile(file) : '';
    const uploadedMediaType = file?.type.startsWith('video/')
      ? 'video'
      : file?.type.startsWith('audio/')
        ? 'voice'
        : file?.type.startsWith('image/')
          ? 'image'
          : form.mediaType;
    setMemories((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        date: form.date,
        title: form.title.trim(),
        note: form.note.trim(),
        mediaType: uploadedMediaUrl ? uploadedMediaType : form.mediaType,
        mediaUrl: uploadedMediaUrl || form.mediaUrl.trim(),
        mediaFileName: file?.name || form.mediaFileName,
      },
    ]);
    event.currentTarget.reset();
    setForm({ date: '', title: '', note: '', mediaType: 'image', mediaUrl: '', mediaFileName: '' });
  }

  return (
    <section id="timeline" className="glass rounded-3xl p-4 sm:p-6">
      <SectionTitle
        overline="Memory Timeline"
        title="Your relationship in living moments"
        subtitle="Add milestones, photos, videos, notes, and voice memories in a shared visual timeline."
      />

      <form onSubmit={addMemory} className="mb-6 grid gap-3 rounded-2xl bg-black/30 p-4 md:grid-cols-2">
        <input
          type="date"
          value={form.date}
          onChange={(event) => setForm((previous) => ({ ...previous, date: event.target.value }))}
          className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-pink-100 outline-none focus:border-blush/70"
          required
        />
        <input
          type="text"
          value={form.title}
          onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
          placeholder="Milestone title"
          className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-pink-100 outline-none focus:border-blush/70"
          required
        />
        <select
          value={form.mediaType}
          onChange={(event) => setForm((previous) => ({ ...previous, mediaType: event.target.value }))}
          className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-pink-100 outline-none"
        >
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="voice">Voice Memory</option>
          <option value="note">Note Only</option>
        </select>
        <input
          type="url"
          value={form.mediaUrl}
          onChange={(event) => setForm((previous) => ({ ...previous, mediaUrl: event.target.value }))}
          placeholder="Photo or video URL"
          className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-pink-100 outline-none focus:border-blush/70"
        />
        <label className="md:col-span-2 cursor-pointer rounded-xl border border-dashed border-white/15 bg-black/35 px-3 py-3 text-sm text-pink-100 transition hover:border-blush/60">
          <span className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 text-roseGold">
              <ImagePlus size={15} />
              <Video size={15} />
              <Mic size={15} />
            </span>
            Upload photo, video, or voice memory
            {form.mediaFileName ? <span className="text-blush">{form.mediaFileName}</span> : null}
          </span>
          <input
            name="mediaFile"
            type="file"
            accept="image/*,video/*,audio/*"
            className="hidden"
            onChange={(event) => setForm((previous) => ({ ...previous, mediaFileName: event.target.files?.[0]?.name || '' }))}
          />
        </label>
        <textarea
          value={form.note}
          onChange={(event) => setForm((previous) => ({ ...previous, note: event.target.value }))}
          placeholder="Describe this memory..."
          rows={3}
          className="md:col-span-2 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-pink-100 outline-none focus:border-blush/70"
        />
        <button
          type="submit"
          className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-5 py-2 text-sm font-semibold text-midnight transition hover:brightness-105"
        >
          <Plus size={15} />
          Add memory
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {!sorted.length ? (
          <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-white/10 bg-black/35 px-4 py-6 text-center text-sm text-pink-100/75">
            No memories saved yet. Add your first milestone to start your timeline.
          </div>
        ) : null}
        {sorted.map((memory, index) => (
          <motion.article
            key={memory.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            viewport={{ once: true }}
            className="overflow-hidden rounded-2xl border border-white/10 bg-black/45 text-pink-100 shadow-2xl"
          >
            <div className="aspect-square bg-black/45">
              {memory.mediaUrl ? (
                memory.mediaType === 'video' ? (
                  memory.mediaUrl.startsWith('data:video/') ? (
                    <video controls src={memory.mediaUrl} className="h-full w-full object-cover" />
                  ) : (
                    <a
                      href={memory.mediaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="grid h-full place-items-center px-4 text-center text-sm text-white"
                    >
                      Open video memory
                    </a>
                  )
                ) : memory.mediaType === 'voice' ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
                    <Mic size={34} className="text-roseGold" />
                    <audio controls className="w-full">
                      <source src={memory.mediaUrl} />
                    </audio>
                  </div>
                ) : (
                  <img src={memory.mediaUrl} alt={memory.title} className="h-full w-full object-cover" />
                )
              ) : (
                <div className="grid h-full place-items-center px-5 text-center text-sm text-pink-100/75">
                  {memory.note || 'Text memory'}
                </div>
              )}
            </div>
            <div className="p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-roseGold">{formatDate(memory.date)}</p>
              <h3 className="mt-1 font-display text-2xl text-white">{memory.title}</h3>
              {memory.note ? <p className="mt-2 text-sm leading-6 text-pink-100/85">{memory.note}</p> : null}
              {memory.mediaFileName ? <p className="mt-3 text-[11px] text-pink-100/55">{memory.mediaFileName}</p> : null}
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
