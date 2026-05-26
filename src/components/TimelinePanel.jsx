import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
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

export default function TimelinePanel() {
  const [memories, setMemories] = useState(() => loadMemories());
  const [form, setForm] = useState({
    date: '',
    title: '',
    note: '',
    mediaType: 'image',
    mediaUrl: '',
  });

  const sorted = useMemo(
    () =>
      [...memories].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [memories],
  );

  useEffect(() => {
    localStorage.setItem(memoriesKey, JSON.stringify(memories));
  }, [memories]);

  function addMemory(event) {
    event.preventDefault();
    if (!form.date || !form.title.trim()) return;
    setMemories((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        date: form.date,
        title: form.title.trim(),
        note: form.note.trim(),
        mediaType: form.mediaType,
        mediaUrl: form.mediaUrl.trim(),
      },
    ]);
    setForm({ date: '', title: '', note: '', mediaType: 'image', mediaUrl: '' });
  }

  return (
    <section id="timeline" className="glass rounded-3xl p-4 sm:p-6">
      <SectionTitle
        overline="Memory Timeline"
        title="Your relationship in living moments"
        subtitle="Add milestones, photos, and videos to keep every chapter touchable."
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
          <option value="video">Video Link</option>
        </select>
        <input
          type="url"
          value={form.mediaUrl}
          onChange={(event) => setForm((previous) => ({ ...previous, mediaUrl: event.target.value }))}
          placeholder="Photo or video URL"
          className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-pink-100 outline-none focus:border-blush/70"
        />
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
            className="rotate-[-1deg] rounded-2xl bg-[#fff7f3] p-3 text-[#381a24] shadow-2xl"
          >
            {memory.mediaUrl ? (
              memory.mediaType === 'video' ? (
                <a
                  href={memory.mediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-2 block rounded-xl bg-black/85 px-3 py-10 text-center text-sm text-white"
                >
                  Open video memory
                </a>
              ) : (
                <img src={memory.mediaUrl} alt={memory.title} className="mb-2 h-44 w-full rounded-xl object-cover" />
              )
            ) : null}
            <p className="text-xs uppercase tracking-[0.18em] text-[#7f4f64]">{formatDate(memory.date)}</p>
            <h3 className="mt-1 font-display text-xl">{memory.title}</h3>
            <p className="mt-1 text-sm">{memory.note}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
