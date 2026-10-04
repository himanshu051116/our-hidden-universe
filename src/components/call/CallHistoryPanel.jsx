import { ChevronDown, Clock3, History, Phone, PhoneMissed, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { subscribeRecentCallHistory } from '../../services/callHistoryService.js';

function toDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resultLabel(result) {
  if (result === 'completed') return 'Completed';
  if (result === 'declined') return 'Declined';
  if (result === 'missed') return 'Missed';
  if (result === 'failed') return 'Failed';
  return 'Cancelled';
}

function durationLabel(seconds) {
  const value = Number(seconds) || 0;
  if (!value) return '';
  const minutes = Math.floor(value / 60);
  const remainder = value % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export default function CallHistoryPanel() {
  const { coupleId } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(
    () => subscribeRecentCallHistory(coupleId, setItems, () => {}),
    [coupleId],
  );

  if (!items.length) return null;

  return (
    <section className="mb-3 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-12 w-full items-center gap-3 px-3 text-left transition hover:bg-white/[0.04]"
        aria-expanded={open}
      >
        <History size={15} className="text-roseGold" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-white">Recent calls</span>
          <span className="block text-[11px] text-pink-100/48">{items.length} recent {items.length === 1 ? 'call' : 'calls'}</span>
        </span>
        <ChevronDown size={16} className={`text-pink-100/55 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="grid gap-2 border-t border-white/10 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const endedAt = toDate(item.endedAt);
            const missed = ['missed', 'declined', 'failed'].includes(item.result);

            return (
              <article
                key={item.id}
                className="flex items-center gap-3 rounded-2xl bg-black/25 px-3 py-3"
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${missed ? 'bg-red-500/10 text-red-200' : 'bg-blush/10 text-blush'}`}>
                  {missed
                    ? <PhoneMissed size={16} />
                    : item.type === 'video'
                      ? <Video size={16} />
                      : <Phone size={16} />}
                </span>

                <div className="min-w-0">
                  <p className="text-xs font-medium text-white">
                    {item.type === 'video' ? 'Video call' : 'Audio call'} · {resultLabel(item.result)}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-pink-100/50">
                    <Clock3 size={10} />
                    {endedAt
                      ? endedAt.toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Recently'}
                    {item.durationSeconds ? ` · ${durationLabel(item.durationSeconds)}` : ''}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
