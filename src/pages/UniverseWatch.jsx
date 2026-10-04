import { ArrowLeft, Clapperboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import WatchPartyPanel from '../components/WatchPartyPanel.jsx';

export default function UniverseWatch() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between gap-3 px-1 sm:px-0">
        <div>
          <Link
            to="/universe/together"
            className="inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-xs text-pink-100/65 transition hover:text-white"
          >
            <ArrowLeft size={15} />
            Together
          </Link>
          <p className="mt-1 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-roseGold">
            <Clapperboard size={14} />
            Watch Together
          </p>
        </div>
      </div>

      <WatchPartyPanel />
    </div>
  );
}
