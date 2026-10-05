import { CalendarClock, CheckCircle2, HardDrive, ListTodo, Music, Sparkles, Target, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { demoPlaylist, dreamBoardSeed } from '../data/demoData.js';
import {
  migrateLocalBucketList,
  removeBucketItem,
  saveBucketItem,
  subscribeBucketList,
} from '../services/coupleDashboardService.js';
import { firebaseEnabled } from '../services/firebase.js';
import { remainingCountdown } from '../utils/date.js';
import SectionTitle from './SectionTitle.jsx';

const extrasKey = 'ohu-extras-v1';

function migrationKey(coupleId) {
  return `ohu-bucket-list-migration-v2:${coupleId || 'local'}`;
}

function loadExtrasState() {
  try {
    const raw = localStorage.getItem(extrasKey);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      meetingDate: typeof parsed.meetingDate === 'string' ? parsed.meetingDate : '',
      playlist: Array.isArray(parsed.playlist) ? parsed.playlist : demoPlaylist,
      dreamBoard: Array.isArray(parsed.dreamBoard) ? parsed.dreamBoard : dreamBoardSeed,
      relationshipStart: typeof parsed.relationshipStart === 'string' ? parsed.relationshipStart : '',
      legacyBucketList: Array.isArray(parsed.bucketList) ? parsed.bucketList : [],
    };
  } catch {
    return {
      meetingDate: '',
      playlist: demoPlaylist,
      dreamBoard: dreamBoardSeed,
      relationshipStart: '',
      legacyBucketList: [],
    };
  }
}

function safeHttpUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

export default function ExtrasPanel() {
  const { user, coupleId } = useAuth();
  const initialState = useMemo(() => loadExtrasState(), []);
  const [meetingDate, setMeetingDate] = useState(initialState.meetingDate);
  const [now, setNow] = useState(Date.now());
  const [playlist, setPlaylist] = useState(initialState.playlist);
  const [dreamBoard, setDreamBoard] = useState(initialState.dreamBoard);
  const [relationshipStart, setRelationshipStart] = useState(initialState.relationshipStart);
  const [bucketList, setBucketList] = useState(() => (firebaseEnabled ? [] : initialState.legacyBucketList));
  const [bucketSyncState, setBucketSyncState] = useState(firebaseEnabled ? 'Connecting…' : 'On this device');
  const [legacyImportAvailable, setLegacyImportAvailable] = useState(false);
  const [deviceNotice, setDeviceNotice] = useState('');

  const countdown = meetingDate ? remainingCountdown(meetingDate, now) : null;
  const daysTogether = useMemo(() => {
    if (!relationshipStart) return null;
    const start = new Date(relationshipStart).getTime();
    if (!Number.isFinite(start)) return null;
    return Math.max(0, Math.floor((Date.now() - start) / 86400000));
  }, [relationshipStart]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!firebaseEnabled || !coupleId || !user?.uid) {
      setBucketList(initialState.legacyBucketList);
      setBucketSyncState('On this device');
      setLegacyImportAvailable(false);
      return undefined;
    }

    let active = true;
    let migrationHandled = localStorage.getItem(migrationKey(coupleId)) === 'done';
    const unsubscribe = subscribeBucketList(
      coupleId,
      (items) => {
        if (!active) return;
        setBucketList(items);
        setBucketSyncState('Synced');

        if (items.length) {
          migrationHandled = true;
          localStorage.setItem(migrationKey(coupleId), 'done');
          setLegacyImportAvailable(false);
          return;
        }

        setLegacyImportAvailable(!migrationHandled && initialState.legacyBucketList.length > 0);
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
    const payload = {
      meetingDate,
      playlist,
      dreamBoard,
      relationshipStart,
    };
    if (!firebaseEnabled) payload.bucketList = bucketList;
    localStorage.setItem(extrasKey, JSON.stringify(payload));
  }, [meetingDate, playlist, dreamBoard, relationshipStart, bucketList]);

  function flashDeviceNotice(message) {
    setDeviceNotice(message);
    window.setTimeout(() => setDeviceNotice(''), 2200);
  }

  async function importLegacyBucketList() {
    if (!firebaseEnabled || !coupleId || !user?.uid || !initialState.legacyBucketList.length) return;
    setBucketSyncState('Moving saved items…');
    try {
      const result = await migrateLocalBucketList(coupleId, user, initialState.legacyBucketList);
      localStorage.setItem(migrationKey(coupleId), 'done');
      setLegacyImportAvailable(false);
      setBucketSyncState(result.migrated || result.reason === 'shared-list-exists' ? 'Synced' : 'Nothing to move');
    } catch {
      setBucketSyncState('Sync unavailable');
    }
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

    if (!firebaseEnabled || !coupleId || !user?.uid) return;
    setBucketSyncState('Saving…');
    try {
      await saveBucketItem(coupleId, user, item);
      localStorage.setItem(migrationKey(coupleId), 'done');
      setLegacyImportAvailable(false);
      setBucketSyncState('Synced');
    } catch {
      setBucketList((previous) => previous.filter((entry) => entry.id !== item.id));
      setBucketSyncState('Sync unavailable');
    }
  }

  async function toggleBucket(item) {
    const updated = { ...item, done: !item.done };
    setBucketList((previous) => previous.map((entry) => (entry.id === item.id ? updated : entry)));
    if (!firebaseEnabled || !coupleId || !user?.uid) return;
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
    if (!firebaseEnabled || !coupleId || !user?.uid) return;
    setBucketSyncState('Saving…');
    try {
      await removeBucketItem(coupleId, item.id);
      localStorage.setItem(migrationKey(coupleId), 'done');
      setLegacyImportAvailable(false);
      setBucketSyncState('Synced');
    } catch {
      setBucketList((previous) => [...previous, item].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)));
      setBucketSyncState('Sync unavailable');
    }
  }

  function addPlaylist(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name')?.toString().trim();
    const artist = formData.get('artist')?.toString().trim();
    const rawUrl = formData.get('url')?.toString().trim();
    const url = safeHttpUrl(rawUrl);
    if (!name || !artist) return;
    if (rawUrl && !url) {
      flashDeviceNotice('Use an http or https link for songs.');
      return;
    }
    setPlaylist((previous) => [...previous, { id: crypto.randomUUID(), name: name.slice(0, 120), artist: artist.slice(0, 120), url }]);
    event.currentTarget.reset();
  }

  function addDream(event) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('dream')?.toString().trim();
    if (!value) return;
    setDreamBoard((previous) => [...previous, value.slice(0, 240)]);
    event.currentTarget.reset();
  }

  return (
    <section id="extras" className="space-y-4">
      <section className="glass rounded-3xl p-4 sm:p-6">
        <SectionTitle
          overline="Plans & little things"
          title="Keep the shared plan clear. Keep device notes honest."
          subtitle="Your Bucket List syncs with your partner. The countdown, playlist, dreams, and relationship date below stay on this device until they get a real shared backend."
        />

        <article className="rounded-2xl border border-blush/25 bg-blush/8 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="inline-flex items-center gap-2 text-sm text-roseGold"><ListTodo size={15} />Couple Bucket List</p>
              <p className="mt-1 text-xs text-pink-100/52">A real-time list both partners can add to, finish, and clean up.</p>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] ${bucketSyncState === 'Synced' ? 'border-emerald-300/20 bg-emerald-300/8 text-emerald-200' : bucketSyncState === 'Sync unavailable' ? 'border-amber-300/20 bg-amber-300/8 text-amber-100' : 'border-white/10 bg-white/[0.035] text-pink-100/55'}`}>
              {bucketSyncState}
            </span>
          </div>

          {legacyImportAvailable ? (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-200/15 bg-amber-200/[0.05] p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-amber-100">Saved device items found</p>
                <p className="mt-1 text-xs leading-5 text-pink-100/50">They will not be restored automatically. Move them only if you still want them in the shared list.</p>
              </div>
              <button type="button" onClick={importLegacyBucketList} className="min-h-10 shrink-0 rounded-full border border-amber-200/20 px-4 text-xs text-amber-100 transition hover:bg-amber-200/8">Move saved items</button>
            </div>
          ) : null}

          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {!bucketList.length ? (
              <div className="md:col-span-2 rounded-xl border border-dashed border-white/12 bg-black/25 px-4 py-6 text-center text-sm text-pink-100/55">Nothing on your shared list yet.</div>
            ) : null}
            {bucketList.map((item) => (
              <div key={item.id} className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 transition ${item.done ? 'border-blush/60 bg-blush/12 text-white' : 'border-white/10 bg-black/30 text-pink-100'}`}>
                <button type="button" onClick={() => toggleBucket(item)} className="flex min-h-10 min-w-0 flex-1 items-center gap-2 px-1 text-left text-sm">
                  <CheckCircle2 size={15} className={`shrink-0 ${item.done ? 'text-blush' : 'text-white/45'}`} />
                  <span className={`break-words ${item.done ? 'line-through opacity-70' : ''}`}>{item.text}</span>
                </button>
                <button type="button" onClick={() => deleteBucket(item)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-pink-100/35 transition hover:bg-red-500/10 hover:text-red-200" aria-label={`Remove ${item.text}`}><X size={13} /></button>
              </div>
            ))}
          </div>

          <form onSubmit={addBucket} className="mt-3 flex gap-2">
            <input name="bucket" maxLength={240} placeholder="Something you want to do together" className="min-h-11 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-pink-100 outline-none focus:border-blush/50" />
            <button type="submit" className="min-h-11 rounded-full bg-gradient-to-r from-blush to-roseGold px-4 text-xs font-semibold text-midnight transition hover:brightness-105">Add</button>
          </form>
        </article>
      </section>

      <section className="glass rounded-3xl p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-roseGold"><HardDrive size={14} />This device only</p>
            <h3 className="mt-1 font-display text-3xl text-white">Personal notes around your shared life.</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-pink-100/58">These cards are saved only in this browser. Your partner will not see changes made here.</p>
          </div>
          <span className="w-fit rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-pink-100/45">Not synced</span>
        </div>

        {deviceNotice ? <p className="mt-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-2 text-xs text-pink-100/62">{deviceNotice}</p> : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-2 text-sm text-roseGold"><CalendarClock size={14} />Next meeting countdown</p>
              {meetingDate ? <button type="button" onClick={() => setMeetingDate('')} className="text-xs text-pink-100/38 hover:text-pink-100">Clear</button> : null}
            </div>
            <input type="datetime-local" value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-pink-100 outline-none focus:border-blush/60" />
            <p className="mt-4 font-display text-2xl text-white">
              {!countdown ? 'Set the next time you plan to meet' : countdown.done ? 'You are together now' : `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`}
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="inline-flex items-center gap-2 text-sm text-roseGold"><Sparkles size={14} />Relationship date</p>
            <input type="date" value={relationshipStart} onChange={(event) => setRelationshipStart(event.target.value)} className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-pink-100 outline-none focus:border-blush/60" />
            <p className="mt-4 text-xs uppercase tracking-[0.16em] text-pink-100/42">Days together on this device</p>
            <p className="mt-1 font-display text-4xl text-white">{daysTogether === null ? '--' : daysTogether}</p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="inline-flex items-center gap-2 text-sm text-roseGold"><Music size={14} />My playlist notes</p>
            <ul className="mt-3 space-y-2">
              {!playlist.length ? <li className="rounded-xl border border-dashed border-white/12 px-3 py-4 text-center text-xs text-pink-100/45">No songs saved on this device.</li> : null}
              {playlist.map((song) => (
                <li key={song.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    {song.url ? <a href={song.url} target="_blank" rel="noreferrer" className="truncate text-sm font-medium text-blush hover:underline">{song.name}</a> : <p className="truncate text-sm text-white">{song.name}</p>}
                    <p className="truncate text-xs text-pink-100/48">{song.artist}</p>
                  </div>
                  <button type="button" onClick={() => setPlaylist((previous) => previous.filter((entry) => entry.id !== song.id))} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-pink-100/30 transition hover:bg-red-500/10 hover:text-red-200" aria-label={`Remove ${song.name}`}><X size={13} /></button>
                </li>
              ))}
            </ul>
            <form onSubmit={addPlaylist} className="mt-3 grid gap-2 sm:grid-cols-2">
              <input name="name" maxLength={120} placeholder="Song name" className="min-h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-pink-100 outline-none" />
              <input name="artist" maxLength={120} placeholder="Artist" className="min-h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-pink-100 outline-none" />
              <input name="url" type="url" placeholder="Link (optional)" className="min-h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-pink-100 outline-none sm:col-span-2" />
              <button type="submit" className="min-h-10 rounded-full bg-white/[0.08] px-4 text-xs text-pink-100 transition hover:bg-white/[0.14] sm:col-span-2">Add song</button>
            </form>
          </article>

          <article className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="inline-flex items-center gap-2 text-sm text-roseGold"><Target size={14} />My dream notes</p>
            <ul className="mt-3 space-y-2">
              {!dreamBoard.length ? <li className="rounded-xl border border-dashed border-white/12 px-3 py-4 text-center text-xs text-pink-100/45">No dreams saved on this device.</li> : null}
              {dreamBoard.map((dream, index) => (
                <li key={`${dream}-${index}`} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-pink-100">
                  <span className="min-w-0 flex-1 break-words">{dream}</span>
                  <button type="button" onClick={() => setDreamBoard((previous) => previous.filter((_, itemIndex) => itemIndex !== index))} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-pink-100/30 transition hover:bg-red-500/10 hover:text-red-200" aria-label={`Remove ${dream}`}><X size={13} /></button>
                </li>
              ))}
            </ul>
            <form onSubmit={addDream} className="mt-3 flex gap-2">
              <input name="dream" maxLength={240} placeholder="Add a dream or idea" className="min-h-10 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-pink-100 outline-none" />
              <button type="submit" className="min-h-10 rounded-full bg-white/[0.08] px-4 text-xs text-pink-100 transition hover:bg-white/[0.14]">Add</button>
            </form>
          </article>
        </div>
      </section>
    </section>
  );
}
