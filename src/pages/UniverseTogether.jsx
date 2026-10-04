import { ArrowRight, BookOpen, Clapperboard, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function UniverseTogether() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="px-1 sm:px-0">
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-roseGold">
          <Sparkles size={14} />
          Together
        </p>
        <h2 className="mt-1 font-display text-3xl leading-tight text-white sm:text-4xl">Do something together, even from far away.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-pink-100/65">Watch in sync or keep your reading progress side by side without digging through unrelated settings.</p>
      </section>

      <Link
        to="/universe/together/watch"
        className="group relative block overflow-hidden rounded-3xl border border-blush/25 bg-[radial-gradient(circle_at_top_right,rgba(244,174,190,.18),transparent_42%),linear-gradient(145deg,rgba(76,33,67,.7),rgba(7,6,17,.92))] p-5 shadow-[0_22px_70px_rgba(0,0,0,.3)] transition hover:border-blush/55 sm:p-7"
      >
        <div className="relative z-10 flex min-h-[180px] flex-col justify-between sm:min-h-[220px]">
          <div>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-blush/30 bg-blush/10 text-blush">
              <Clapperboard size={21} />
            </span>
            <p className="mt-5 text-xs uppercase tracking-[0.18em] text-roseGold">Flagship activity</p>
            <h3 className="mt-1 font-display text-3xl text-white sm:text-4xl">Watch Together</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-pink-100/68">Open a shared watch room, coordinate playback and get back in sync when one of you drifts.</p>
          </div>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blush">
            Open Watch Together <ArrowRight size={16} className="transition group-hover:translate-x-1" />
          </span>
        </div>
      </Link>

      <Link
        to="/universe/together/read"
        className="group glass block rounded-2xl p-4 transition hover:border-blush/40 sm:rounded-3xl sm:p-5"
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-roseGold">
            <BookOpen size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-2xl text-white">Read Together</h3>
            <p className="mt-1 max-w-xl text-sm leading-5 text-pink-100/62">Save where you are, see your partner's spot, and continue from one dedicated reading screen.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blush">
              Open reading <ArrowRight size={14} className="transition group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
