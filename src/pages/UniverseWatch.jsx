import { ArrowLeft, Clapperboard, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';
import WatchPartyPanel from '../components/WatchPartyPanel.jsx';
import WatchCallPanel from '../components/call/WatchCallPanel.jsx';

export default function UniverseWatch() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="flex flex-col justify-between gap-3 px-1 sm:flex-row sm:items-end sm:px-0">
        <div>
          <Link
            to="/universe/together"
            className="inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-xs text-pink-100/65 transition hover:text-white"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Together
          </Link>
          <p className="mt-1 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-roseGold">
            <Clapperboard size={14} aria-hidden="true" />
            Watch Together
          </p>
          <h1 className="mt-1 font-display text-3xl text-white sm:text-4xl">One movie. Two screens. One call.</h1>
        </div>
        <p className="flex max-w-sm items-start gap-2 text-xs leading-5 text-pink-100/65">
          <Headphones size={16} className="mt-0.5 shrink-0 text-roseGold" aria-hidden="true" />
          Wear headphones for clearer voice calls while watching. Playback sync and video calling are separate connections.
        </p>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(285px,340px)] lg:gap-5">
        <div className="min-w-0">
          <WatchPartyPanel />
        </div>
        <WatchCallPanel />
      </div>
    </div>
  );
}
