import { BookOpen, CalendarClock, CheckCircle2, ListTodo, Music, Sparkle, Target, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { bucketListSeed, demoPlaylist, dreamBoardSeed, quotePool } from '../data/demoData.js';
import {
  loadLocalReadTogether,
  migrateLocalBucketList,
  removeBucketItem,
  saveBucketItem,
  saveReadTogether,
  subscribeBucketList,
  subscribeReadTogether,
} from '../services/coupleDashboardService.js';
import { firebaseEnabled } from '../services/firebase.js';
import { remainingCountdown } from '../utils/date.js';
import SectionTitle from './SectionTitle.jsx';
import WatchPartyPanel from './WatchPartyPanel.jsx';

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
        hadStoredBucketList: false,
      };
    }

    return {
      meetingDate: typeof parsed.meetingDate === 'string' ? parsed.meetingDate : '',
      playlist: Array.isArray(parsed.playlist) ? parsed.playlist : demoPlaylist,
      dreamBoard: Array.isArray(parsed.dreamBoard) ? parsed.dreamBoard : dreamBoardSeed,
      bucketList: Array.isArray(parsed.bucketList) ? parsed.bucketList : defaultBucketList(),
      quote: typeof parsed.quote === 'string' && parsed.quote ? parsed.quote : quotePool[0],
      relationshipStart: typeof parsed.relationshipStart === 'string' ? parsed.relationshipStart : '',
      hadStoredBucketList: Array.isArray(parsed.bucketList),
    };
  } catch {
    return {
      meetingDate: '',
      playlist: demoPlaylist,
      dreamBoard: dreamBoardSeed,
      bucketList: defaultBucketList(),
      quote: quotePool[0],
      relationshipStart: '',
      hadStoredBucketList: false,
    };
  }
}

export default function ExtrasPanel({ messageCount = 0, memoryCount = 0 }) {
  const { user, coupleId } = useAuth();
  const initialState = useMemo(() => loadExtrasState(), []);
  const [meetingDate, setMeetingDate] = useState(initialState.meetingDate);
  const [now, setNow] = useState(Date.now());
  const [playlist, setPlaylist] = useState(initialState.playlist);
  const [dreamBoard, setDreamBoard] = useState(initialState.dreamBoard);
  const [bucketList, setBucketList] = useState(initialState.bucketList);
  const [bucketSyncState, setBucketSyncState] = useState(firebaseEnabled ? 'Connecting…' : 'On this device');
  const [quote, setQuote] = useState(initialState.quote);
  const [relationshipStart, setRelationshipStart] = useState(initialState.relationshipStart);
  const [readTogether, setReadTogether] = useState(() => loadLocalReadTogether());
  const [readSaveState, setReadSaveState] = useState('');
  const bucketMigrationRef = useRef(false);

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
    const unsubscribe = subscribeReadTogether(coupleId, (state) => {
      const selfProgress = state.progressByUser?.[user?.uid] || {};
      const partnerProgress = Object.entries(state.progressByUser || {}).find(([uid]) => uid !== user?.uid)?.[1] || {};
      setReadTogether({
        title: state.title || '',
        link: state.link || '',
        selfChapter: selfProgress.chapter || '',
        selfPage: selfProgress.page || '',
        partnerChapter: partnerProgress.chapter || '',
        partnerPage: partnerProgress.page || '',
        partnerName: partnerProgress.displayName || 'Partner',
        progressByUser: state.progressByUser || {},
      });
    });
    return () => unsubscribe?.();
  }, [coupleId, user?.uid]);

  useEffect(() => {
    if (!firebaseEnabled || !coupleId || !user?.uid) {
      setBucketSyncState('On this device');
      return undefined;
    }

    let active = true;
    const unsubscribe = subscribeBucketList(
      coupleId,
      async (items) => {
        if (!active) return;
        if (items.length) {
          setBucketList(items);
          setBucketSyncState('Synced');
          return;
        }

        if (
          !bucketMigrationRef.current
          && initialState.hadStoredBucketList
          && initialState.bucketList.length
        ) {
          bucketMigrationRef.current = true;
          setBucketSyncState('Moving saved items…');
          try {
            const result = await migrateLocalBucketList(coupleId, user, initialState.bucketList);
            if (!active) return;
            if (!result.migrated && result.reason !== 'shared-list-exists') {
              setBucketList([]);
              setBucketSyncState('Synced');
            }
          } catch {
            if (active) setBucketSyncState('Sync unavailable');
          }
          return;
        }

        setBucketList([]);
        setBucketSyncState('Synced');
      },
      () => {
        if (active) setBucketSyncState('Sync unavailable');
      },
    );

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [coupleId, user?.uid, initialState]);

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

  async function onSaveReading(event) {
    event.preventDefault();
    await saveReadTogether(coupleId, user, readTogether);
    setReadSaveState('Progress saved');
    window.setTimeout(() => setReadSaveState(''), 1600);
  }

  async function addBucket(event) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('bucket')?.toString().trim();
    if (!value) return;
    const item = {
      id: crypto.randomUUID(),
      text: value.slice(0, 240),
      done: false,
      createdAt: new Date().toISOString(),
      createdBy: user?.uid || 'local',
    };
    setBucketList((previous) => [...previous, item]);
    event.currentTarget.reset();

    if (!firebaseEnabled) return;
    setBucketSyncState('Saving…');
    try {
      await saveBucketItem(coupleId, user, item);
      setBucketSyncState('Synced');
    } catch {
      setBucketList((previous) => previous.filter((entry) => entry.id !== item.id));
      setBucketSyncState('Sync unavailable');
    }
  }

  async function toggleBucket(item) {
    const updated = { ...item, done: !item.done };
    setBucketList((previous) => previous.map((entry) => (entry.id === item.id ? updated : entry)));
    if (!firebaseEnabled) return;
    setBucketSyncState('Saving…');
    try {
      await saveBucketItem(coupleId, user, updated);
      setBucketSyncState('Synced');
    } catch {
      setBucketList((previous) => previous.map((entry) => (entry.id === item.id ? item : entry)));
      setBucketSyncState('Sync unavailable');
    }
  }

  async function deleteBucket(item) {
    setBucketList((previous) => previous.filter((entry) => entry.id !== item.id));
    if (!firebaseEnabled) return;
    setBucketSyncState('Saving…');
    try {
      await removeBucketItem(coupleId, item.id);
      setBucketSyncState('Synced');
    } catch {
      setBucketList((previous) => [...previous, item].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)));
      setBucketSyncState('Sync unavailable');
    }
  }

  return (
    <section id="extras" className="glass rounded-3xl p-4 sm:p-6">
      <SectionTitle
        overline="Shared Life"
        title="Playlist, countdown, dreams, bucket list, and stats"
        subtitle="Reading and the bucket list sync live with your partner. Playlist, countdown, dreams, and relationship dates stay on this device for now."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <WatchPartyPanel />

        <article id="read-together" className="scroll-mt-24 rounded-2xl border border-blush/25 bg-blush/10 p-4 lg:col-span-2">
          <p className="inline-flex items-center gap-2 text-sm text-roseGold">
            <BookOpen size={14} />
            Read Manga / Manhwa Together
          </p>
          <form onSubmit={onSaveReading} className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={readTogether.title}
              onChange={(event) => setReadTogether((previous) => ({ ...previous, title: event.target.value }))}
              placeholder="Series title"
              className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-blush/70"
            />
            <input
              value={readTogether.link}
              onChange={(event) => setReadTogether((previous) => ({ ...previous, link: event.target.value }))}
              placeholder="Reading link"
              className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-blush/70"
            />
            <input
              value={readTogether.selfChapter}
              onChange={(event) => setReadTogether((previous) => ({ ...previous, selfChapter: event.target.value }))}
              placeholder="My chapter"
              className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-blush/70"
            />
            <input
              value={readTogether.selfPage}
              onChange={(event) => setReadTogether((previous) => ({ ...previous, selfPage: event.target.value }))}
              placeholder="My page / episode"
              className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-blush/70"
            />
            <div className="rounded-2xl border border-white/10 bg-black/35 p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.16em] text-roseGold">Partner Progress</p>
              <p className="mt-2 text-sm text-pink-100">
                {readTogether.partnerChapter || readTogether.partnerPage
                  ? `${readTogether.partnerName || 'Partner'} is at chapter ${readTogether.partnerChapter || '--'}, page ${readTogether.partnerPage || '--'}`
                  : 'No partner progress yet.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 md:col-span-2">
              {readTogether.link ? (
                <a href={readTogether.link} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-4 py-2 text-xs text-pink-100 transition hover:border-blush/70">
                  Open series
                </a>
              ) : null}
              <button type="submit" className="rounded-full bg-gradient-to-r from-blush to-roseGold px-5 py-2 text-xs font-semibold text-midnight transition hover:brightness-105">
                Save progress
              </button>
              {readSaveState ? <span className="text-xs text-blush">{readSaveState}</span> : null}
            </div>
          </form>
        </article>

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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-2 text-sm text-roseGold">
              <ListTodo size={14} />
              Couple Bucket List
            </p>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] ${bucketSyncState === 'Synced' ? 'border-emerald-300/20 bg-emerald-300/8 text-emerald-200' : bucketSyncState === 'Sync unavailable' ? 'border-amber-300/20 bg-amber-300/8 text-amber-100' : 'border-white/10 bg-white/[0.035] text-pink-100/55'}`}>
              {bucketSyncState}
            </span>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {!bucketList.length ? (
              <div className="md:col-span-2 rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-xs text-pink-100/70">
                No bucket list items yet. Add your first plan together.
              </div>
            ) : null}
            {bucketList.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 transition ${item.done ? 'border-blush/70 bg-blush/15 text-white' : 'border-white/10 bg-black/35 text-pink-100'}`}
              >
                <button
                  type="button"
                  onClick={() => toggleBucket(item)}
                  className="flex min-h-9 min-w-0 flex-1 items-center gap-2 px-1 text-left text-sm"
                >
                  <CheckCircle2 size={14} className={`shrink-0 ${item.done ? 'text-blush' : 'text-white/60'}`} />
                  <span className={`break-words ${item.done ? 'line-through opacity-75' : ''}`}>{item.text}</span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteBucket(item)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-pink-100/35 transition hover:bg-red-500/10 hover:text-red-200"
                  aria-label={`Remove ${item.text}`}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={addBucket} className="mt-3 flex gap-2">
            <input name="bucket" maxLength={240} placeholder="Add something you want to do together" className="flex-1 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-pink-100 outline-none focus:border-blush/50" />
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
