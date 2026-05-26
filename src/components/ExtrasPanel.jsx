import { CalendarClock, CheckCircle2, ListTodo, Music, Sparkle, Target } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { bucketListSeed, demoPlaylist, dreamBoardSeed, quotePool } from '../data/demoData.js';
import { remainingCountdown } from '../utils/date.js';
import SectionTitle from './SectionTitle.jsx';

const extrasKey = 'ohu-extras-v1';
const memoriesKey = 'ohu-memories-v1';

function defaultBucketList() {
  return bucketListSeed.map((item) => ({ id: crypto.randomUUID(), text: item, done: false }));
}

function loadExtrasState() {
  try {
    const raw = localStorage.getItem(extrasKey);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') {
      return {
        meetingDate: '',
        playlist: demoPlaylist,
        dreamBoard: dreamBoardSeed,
        bucketList: defaultBucketList(),
        quote: quotePool[0],
        relationshipStart: '',
      };
    }

    return {
      meetingDate: typeof parsed.meetingDate === 'string' ? parsed.meetingDate : '',
      playlist: Array.isArray(parsed.playlist) ? parsed.playlist : demoPlaylist,
      dreamBoard: Array.isArray(parsed.dreamBoard) ? parsed.dreamBoard : dreamBoardSeed,
      bucketList: Array.isArray(parsed.bucketList) ? parsed.bucketList : defaultBucketList(),
      quote: typeof parsed.quote === 'string' && parsed.quote ? parsed.quote : quotePool[0],
      relationshipStart: typeof parsed.relationshipStart === 'string' ? parsed.relationshipStart : '',
    };
  } catch {
    return {
      meetingDate: '',
      playlist: demoPlaylist,
      dreamBoard: dreamBoardSeed,
      bucketList: defaultBucketList(),
      quote: quotePool[0],
      relationshipStart: '',
    };
  }
}

export default function ExtrasPanel({ messageCount = 0, memoryCount = 0 }) {
  const initialState = useMemo(() => loadExtrasState(), []);
  const [meetingDate, setMeetingDate] = useState(initialState.meetingDate);
  const [now, setNow] = useState(Date.now());
  const [playlist, setPlaylist] = useState(initialState.playlist);
  const [dreamBoard, setDreamBoard] = useState(initialState.dreamBoard);
  const [bucketList, setBucketList] = useState(initialState.bucketList);
  const [quote, setQuote] = useState(initialState.quote);
  const [relationshipStart, setRelationshipStart] = useState(initialState.relationshipStart);

  const countdown = meetingDate ? remainingCountdown(meetingDate, now) : null;
  const daysTogether = useMemo(() => {
    if (!relationshipStart) return null;
    return Math.floor((Date.now() - new Date(relationshipStart).getTime()) / 86400000);
  }, [relationshipStart]);
  const resolvedMemoryCount = useMemo(() => {
    if (memoryCount) return memoryCount;
    try {
      const raw = localStorage.getItem(memoriesKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }, [memoryCount]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(
      extrasKey,
      JSON.stringify({
        meetingDate,
        playlist,
        dreamBoard,
        bucketList,
        quote,
        relationshipStart,
      }),
    );
  }, [meetingDate, playlist, dreamBoard, bucketList, quote, relationshipStart]);

  function addPlaylist(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name')?.toString().trim();
    const artist = formData.get('artist')?.toString().trim();
    const url = formData.get('url')?.toString().trim();
    if (!name || !artist) return;
    setPlaylist((previous) => [...previous, { id: crypto.randomUUID(), name, artist, url: url || 'https://open.spotify.com/' }]);
    event.currentTarget.reset();
  }

  function addSimpleItem(setter, fieldName, event) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get(fieldName)?.toString().trim();
    if (!value) return;
    setter((previous) => [...previous, value]);
    event.currentTarget.reset();
  }

  return (
    <section id="extras" className="glass rounded-3xl p-4 sm:p-6">
      <SectionTitle
        overline="Shared Life"
        title="Playlist, countdown, dreams, bucket list, and stats"
        subtitle="Everything beyond chat that keeps long distance relational, intentional, and joyful."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-black/35 p-4">
          <p className="inline-flex items-center gap-2 text-sm text-roseGold">
            <CalendarClock size={14} />
            Countdown Until Next Meeting
          </p>
          <input
            type="datetime-local"
            value={meetingDate}
            onChange={(event) => setMeetingDate(event.target.value)}
            className="mt-3 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-pink-100 outline-none focus:border-blush/70"
          />
          <p className="mt-3 font-display text-2xl text-white">
            {!countdown
              ? 'Set your next meeting date to start countdown'
              : countdown.done
                ? 'You are together now'
                : `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`}
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-black/35 p-4">
          <p className="inline-flex items-center gap-2 text-sm text-roseGold">
            <Sparkle size={14} />
            Daily Love Quote Generator
          </p>
          <p className="mt-3 min-h-14 text-pink-100">{quote}</p>
          <button
            type="button"
            onClick={() => setQuote(quotePool[Math.floor(Math.random() * quotePool.length)])}
            className="mt-2 rounded-full border border-blush/60 px-4 py-2 text-xs text-blush transition hover:bg-blush/10"
          >
            New quote
          </button>
        </article>

        <article className="rounded-2xl border border-white/10 bg-black/35 p-4">
          <p className="inline-flex items-center gap-2 text-sm text-roseGold">
            <Music size={14} />
            Shared Music Playlist
          </p>
          <ul className="mt-3 space-y-2 text-sm text-pink-100/90">
            {!playlist.length ? (
              <li className="rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-xs text-pink-100/70">
                No songs added yet.
              </li>
            ) : null}
            {playlist.map((song) => (
              <li key={song.id} className="rounded-xl border border-white/10 bg-black/35 px-3 py-2">
                <a href={song.url} target="_blank" rel="noreferrer" className="font-medium text-blush hover:underline">
                  {song.name}
                </a>
                <p className="text-xs text-pink-100/75">{song.artist}</p>
              </li>
            ))}
          </ul>
          <form onSubmit={addPlaylist} className="mt-3 grid gap-2">
            <input name="name" placeholder="Song name" className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-pink-100 outline-none" />
            <input name="artist" placeholder="Artist" className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-pink-100 outline-none" />
            <input name="url" placeholder="Link (optional)" className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-pink-100 outline-none" />
            <button type="submit" className="rounded-full bg-white/10 px-4 py-2 text-xs text-pink-100 transition hover:bg-white/20">
              Add song
            </button>
          </form>
        </article>

        <article className="rounded-2xl border border-white/10 bg-black/35 p-4">
          <p className="inline-flex items-center gap-2 text-sm text-roseGold">
            <Target size={14} />
            Shared Dream Board
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-pink-100">
            {!dreamBoard.length ? (
              <li className="list-none rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-xs text-pink-100/70">
                No dreams added yet.
              </li>
            ) : null}
            {dreamBoard.map((dream) => (
              <li key={dream}>{dream}</li>
            ))}
          </ul>
          <form onSubmit={(event) => addSimpleItem(setDreamBoard, 'dream', event)} className="mt-3 flex gap-2">
            <input name="dream" placeholder="Add dream" className="flex-1 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-pink-100 outline-none" />
            <button type="submit" className="rounded-full bg-white/10 px-4 py-2 text-xs text-pink-100 transition hover:bg-white/20">
              Add
            </button>
          </form>
        </article>

        <article className="rounded-2xl border border-white/10 bg-black/35 p-4 lg:col-span-2">
          <p className="inline-flex items-center gap-2 text-sm text-roseGold">
            <ListTodo size={14} />
            Couple Bucket List
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {!bucketList.length ? (
              <div className="md:col-span-2 rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-xs text-pink-100/70">
                No bucket list items yet.
              </div>
            ) : null}
            {bucketList.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setBucketList((previous) => previous.map((entry) => (entry.id === item.id ? { ...entry, done: !entry.done } : entry)))}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition ${item.done ? 'border-blush/70 bg-blush/15 text-white' : 'border-white/10 bg-black/35 text-pink-100'}`}
              >
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 size={14} className={item.done ? 'text-blush' : 'text-white/60'} />
                  {item.text}
                </span>
              </button>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const value = new FormData(event.currentTarget).get('bucket')?.toString().trim();
              if (!value) return;
              setBucketList((previous) => [...previous, { id: crypto.randomUUID(), text: value, done: false }]);
              event.currentTarget.reset();
            }}
            className="mt-3 flex gap-2"
          >
            <input name="bucket" placeholder="Add bucket item" className="flex-1 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-pink-100 outline-none" />
            <button type="submit" className="rounded-full bg-white/10 px-4 py-2 text-xs text-pink-100 transition hover:bg-white/20">
              Add
            </button>
          </form>
        </article>
      </div>

      <article className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-black/35 p-4 text-sm text-pink-100 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <p className="text-xs uppercase tracking-[0.18em] text-roseGold">Relationship Start Date</p>
          <input
            type="date"
            value={relationshipStart}
            onChange={(event) => setRelationshipStart(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-pink-100 outline-none focus:border-blush/70"
          />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-roseGold">Days together</p>
          <p className="mt-1 font-display text-3xl text-white">{daysTogether === null ? '--' : daysTogether}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-roseGold">Messages shared</p>
          <p className="mt-1 font-display text-3xl text-white">{messageCount}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-roseGold">Memories captured</p>
          <p className="mt-1 font-display text-3xl text-white">{resolvedMemoryCount}</p>
        </div>
      </article>
    </section>
  );
}
