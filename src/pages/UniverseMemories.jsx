import { Images } from 'lucide-react';
import TimelinePanel from '../components/TimelinePanel.jsx';

export default function UniverseMemories() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="px-1 sm:px-0">
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-roseGold">
          <Images size={14} />
          Memories
        </p>
        <h2 className="mt-1 font-display text-3xl text-white sm:text-4xl">The moments you chose to keep.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-pink-100/60">The current memory store remains device-local while the shared-memory migration is completed.</p>
      </section>
      <TimelinePanel />
    </div>
  );
}
