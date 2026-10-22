import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Clapperboard,
  Heart,
  Lock,
  MessageCircleHeart,
  Play,
  Sparkles,
  Stars,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const demoStars = [
  [12, 18], [26, 62], [35, 32], [46, 78], [59, 17], [70, 54],
  [84, 26], [91, 75], [18, 85], [43, 13], [64, 82], [76, 13],
  [8, 50], [92, 45],
];

const previewTabs = [
  { key: 'chat', label: 'Chat', icon: MessageCircleHeart },
  { key: 'sky', label: 'Night Sky', icon: Stars },
  { key: 'letters', label: 'Letters', icon: Heart },
  { key: 'watch', label: 'Together', icon: Clapperboard },
];

const features = [
  {
    icon: MessageCircleHeart,
    eyebrow: 'THE EVERYDAY',
    title: 'A place for the little things',
    description: 'Keep conversations, photos, voice notes and calls close, even on the busiest days.',
  },
  {
    icon: Stars,
    eyebrow: 'THE MEMORIES',
    title: 'Make your own constellation',
    description: 'Save moments, leave stars in your shared sky, and revisit the story you are writing.',
  },
  {
    icon: BookOpen,
    eyebrow: 'THE SURPRISES',
    title: 'Something to look forward to',
    description: 'Write Open When letters, watch together, and make plans for the days you will share.',
  },
];

function ChatPreview() {
  return (
    <div className="flex min-h-[275px] flex-col justify-end gap-3 rounded-[22px] border border-white/10 bg-[#090b19]/90 p-4 sm:min-h-[308px] sm:p-5">
      <div className="mb-auto flex items-center gap-3 border-b border-white/10 pb-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#48314f] text-lg" aria-hidden="true">🌙</span>
        <div>
          <p className="text-sm font-semibold text-white">Your favourite person</p>
          <p className="text-[11px] text-emerald-200/75">A little closer, right here</p>
        </div>
      </div>
      <div className="max-w-[85%] self-start rounded-2xl rounded-bl-md bg-white/[0.09] px-4 py-3 text-sm leading-6 text-pink-100/90">
        I saw the moon and thought of you. 🌙
      </div>
      <div className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-[#a85885]/35 px-4 py-3 text-sm leading-6 text-white">
        Then we were looking at the same sky. ❤️
      </div>
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-pink-100/50">
        <span className="flex-1">Your message goes here…</span>
        <MessageCircleHeart size={16} className="text-[#ffbdd4]" aria-hidden="true" />
      </div>
    </div>
  );
}

function SkyPreview({ count, addStar }) {
  return (
    <div className="relative flex min-h-[275px] flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[radial-gradient(circle_at_50%_78%,#322044_0%,#10152e_37%,#060814_82%)] p-4 sm:min-h-[308px] sm:p-5">
      <div className="relative z-10">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#f5bdd3]">OUR NIGHT SKY</p>
        <h3 className="mt-1 font-display text-3xl text-white">A sky made of memories.</h3>
      </div>
      <div className="pointer-events-none absolute inset-x-4 inset-y-14" aria-hidden="true">
        {demoStars.slice(0, count).map(([left, top], index) => (
          <span
            key={index}
            className="absolute h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_12px_2px_rgba(255,214,235,.75)]"
            style={{ left: left + '%', top: top + '%', opacity: 0.64 + (index % 3) * 0.16 }}
          />
        ))}
        <div className="absolute bottom-[17%] left-[30%] h-28 w-28 rounded-full bg-[#bb5c9c]/15 blur-3xl" />
      </div>
      <div className="relative z-10 mt-auto flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#090a1c]/70 p-3 backdrop-blur-sm">
        <p className="text-xs leading-5 text-pink-100/75" aria-live="polite">
          {count} little moments in this sample sky
        </p>
        <button
          type="button"
          onClick={addStar}
          className="shrink-0 rounded-full bg-[#ffc2d6] px-3 py-2 text-xs font-bold text-[#210f25] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc2d6]"
        >
          {count === demoStars.length ? 'Reset sky' : '+ Add a star'}
        </button>
      </div>
    </div>
  );
}

function LetterPreview({ open, toggle }) {
  return (
    <div className="relative flex min-h-[275px] flex-col items-center justify-center overflow-hidden rounded-[22px] border border-white/10 bg-[radial-gradient(circle_at_50%_34%,#472a4a,#17101e_65%,#0d0b18)] px-6 py-5 text-center sm:min-h-[308px]">
      <span className="mb-4 grid h-16 w-20 place-items-center rounded-xl border border-[#ffb7cf]/30 bg-[#ffb7cf]/15 text-3xl shadow-[0_15px_45px_rgba(0,0,0,.25)]" aria-hidden="true">
        {open ? '💌' : '✉️'}
      </span>
      <p className="text-xs uppercase tracking-[0.18em] text-[#ffbfd1]">Open when…</p>
      <h3 className="mt-2 font-display text-3xl leading-tight text-white">
        {open ? 'You are never far from my heart.' : 'You miss me a little more.'}
      </h3>
      <p className="mt-2 max-w-xs text-sm leading-6 text-pink-100/70" aria-live="polite">
        {open
          ? 'Here is a small reminder: I am always cheering for you, wherever we are.'
          : 'A little note to be opened on exactly the right day.'}
      </p>
      <button
        type="button"
        onClick={toggle}
        className="mt-5 min-h-10 rounded-full border border-[#ffc2d6]/50 bg-[#ffc2d6]/15 px-5 text-sm font-semibold text-[#ffdae5] transition hover:bg-[#ffc2d6]/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc2d6]"
      >
        {open ? 'Close sample letter' : 'Open sample letter'}
      </button>
    </div>
  );
}

function WatchPreview({ playing, toggle }) {
  return (
    <div className="flex min-h-[275px] flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[#0a0b17] p-4 sm:min-h-[308px] sm:p-5">
      <div className="relative grid min-h-[166px] flex-1 place-items-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_45%_30%,#714c79,#26233e_52%,#111426)]">
        <div className="absolute left-[15%] top-[25%] h-20 w-20 rounded-full border border-white/10" aria-hidden="true" />
        <div className="absolute right-[12%] bottom-[14%] h-32 w-32 rounded-full border border-[#f9c7e0]/10" aria-hidden="true" />
        <div className="relative z-10 text-center">
          <Clapperboard className="mx-auto mb-2 text-[#ffc4d8]" size={29} aria-hidden="true" />
          <p className="font-display text-3xl text-white">Movie night, together.</p>
          <p className="mt-1 text-xs text-pink-100/65">Same moment. Two different places.</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <div aria-live="polite">
          <p className="text-sm font-semibold text-white">{playing ? 'Sample session started' : 'Your next movie night'}</p>
          <p className="mt-1 text-xs text-pink-100/60">Illustrative preview · not a live stream</p>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-[#ffc2d6] px-4 text-xs font-bold text-[#210f25] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc2d6]"
        >
          <Play size={12} aria-hidden="true" />
          {playing ? 'Reset demo' : 'Try demo'}
        </button>
      </div>
    </div>
  );
}

function UniversePreview() {
  const [activeTab, setActiveTab] = useState('chat');
  const [starCount, setStarCount] = useState(8);
  const [letterOpen, setLetterOpen] = useState(false);
  const [watchPlaying, setWatchPlaying] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <div id="preview" className="relative mx-auto w-full max-w-[530px] scroll-mt-24">
      <div className="pointer-events-none absolute -inset-6 rounded-[40px] bg-[#c65a98]/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-[30px] border border-white/15 bg-[#151022]/95 p-3 shadow-[0_32px_85px_rgba(0,0,0,.5)] sm:rounded-[36px] sm:p-4">
        <div className="mb-4 flex items-center justify-between gap-2 px-1 pt-1">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#ef9fbd]/15 text-[#ffbed2]">
              <Heart size={15} fill="currentColor" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold text-white">A little look inside</p>
              <p className="text-[10px] text-pink-100/55">Explore before you sign up</p>
            </div>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] text-pink-100/70">SAMPLE</span>
        </div>
        <div role="group" aria-label="Explore feature previews" className="mb-3 grid grid-cols-4 gap-1 rounded-2xl bg-black/30 p-1">
          {previewTabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              aria-pressed={activeTab === key}
              onClick={() => setActiveTab(key)}
              className={
                'flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc2d6] sm:flex-row sm:gap-2 sm:text-xs ' +
                (activeTab === key ? 'bg-[#ffc2d6] text-[#241224]' : 'text-pink-100/70 hover:bg-white/10 hover:text-white')
              }
            >
              <Icon size={15} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        <motion.div
          key={activeTab}
          initial={reduceMotion ? false : { opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          aria-label={previewTabs.find((tab) => tab.key === activeTab)?.label + ' sample'}
          role="region"
        >
          {activeTab === 'chat' && <ChatPreview />}
          {activeTab === 'sky' && (
            <SkyPreview
              count={starCount}
              addStar={() => setStarCount((count) => count >= demoStars.length ? 8 : count + 1)}
            />
          )}
          {activeTab === 'letters' && <LetterPreview open={letterOpen} toggle={() => setLetterOpen((open) => !open)} />}
          {activeTab === 'watch' && <WatchPreview playing={watchPlaying} toggle={() => setWatchPlaying((playing) => !playing)} />}
        </motion.div>
        <p className="mt-3 px-1 text-center text-[11px] leading-5 text-pink-100/55">
          Fictional example only. Your real conversations and memories are never shown here.
        </p>
      </div>
    </div>
  );
}

export default function Landing() {
  const { user, coupleCode } = useAuth();
  const hasUniverse = Boolean(user && coupleCode);
  const primaryDestination = hasUniverse ? '/universe/home' : '/login?mode=signup';
  const primaryText = hasUniverse ? 'Open your universe' : 'Create our space';
  const reduceMotion = useReducedMotion();

  return (
    <PageShell>
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-50 rounded-full bg-[#ffc2d6] px-4 py-2 text-[#210f25] focus:not-sr-only"
      >
        Skip to content
      </a>

      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-5 sm:px-8 lg:px-10">
        <Link to="/" className="inline-flex min-w-0 items-center gap-2.5 text-sm font-semibold text-white focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffc2d6]">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#ffc2d6]/35 bg-[#ffc2d6]/10 text-[#ffc2d6]">
            <Heart size={17} fill="currentColor" aria-hidden="true" />
          </span>
          <span className="truncate tracking-[-0.02em]">our hidden universe</span>
        </Link>
        <nav aria-label="Main navigation" className="flex shrink-0 items-center gap-3 sm:gap-6">
          <a className="hidden text-xs font-medium text-pink-100/70 transition hover:text-white md:inline" href="#features">What you can do</a>
          <a className="hidden text-xs font-medium text-pink-100/70 transition hover:text-white md:inline" href="#how-it-works">How it works</a>
          <Link to={hasUniverse ? '/universe/home' : '/login?mode=login'} className="rounded-full border border-[#ffcfdf]/30 px-3 py-2.5 text-xs font-semibold text-pink-100 transition hover:border-[#ffcfdf]/60 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc2d6] sm:px-5">
            {hasUniverse ? 'Open space' : 'Join with a code'}
          </Link>
        </nav>
      </header>

      <main id="main-content">
        <section className="relative mx-auto grid w-full max-w-7xl items-center gap-9 px-4 pb-16 pt-7 sm:px-8 sm:pt-12 lg:grid-cols-[.96fr_1.04fr] lg:gap-12 lg:px-10 lg:pb-28 lg:pt-16">
          <div className="relative z-10">
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="inline-flex items-center gap-2 rounded-full border border-[#ffc2d6]/20 bg-[#ffc2d6]/[0.07] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.17em] text-[#ffc2d6] sm:text-xs"
            >
              <Sparkles size={14} aria-hidden="true" />
              A little world, just for two
            </motion.p>
            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.07 }}
              className="mt-5 max-w-[640px] font-display text-[clamp(2.85rem,6vw,5.4rem)] font-semibold leading-[.99] tracking-[-0.025em] text-white"
            >
              Feel closer, <span className="text-[#ffbbd2]">even from miles away.</span>
            </motion.h1>
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.14 }}
              className="mt-5 max-w-lg text-sm leading-7 text-pink-100/80 sm:text-base sm:leading-8"
            >
              A private space to talk, watch something together, save your favourite memories, and leave little surprises for each other.
            </motion.p>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="mt-7 flex flex-wrap items-center gap-3"
            >
              <Link
                to={primaryDestination}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#ffc2d6] px-6 text-sm font-bold text-[#271426] shadow-[0_10px_35px_rgba(255,182,200,.2)] transition hover:-translate-y-0.5 hover:bg-[#ffe0e9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc2d6] sm:w-auto"
              >
                {primaryText}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <a
                href="#preview"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-white/20 px-6 text-sm font-semibold text-pink-100 transition hover:border-[#ffc2d6]/60 hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc2d6] sm:w-auto"
              >
                <Play size={15} aria-hidden="true" />
                Try the preview
              </a>
            </motion.div>
            <p className="mt-4 flex items-center gap-2 text-xs leading-5 text-pink-100/60">
              <Lock size={13} className="shrink-0 text-[#ffc2d6]" aria-hidden="true" />
              Just the two of you. Make a space, then invite your person.
            </p>
            <div className="mt-8 hidden items-center gap-5 border-t border-white/10 pt-5 text-xs text-pink-100/60 lg:flex">
              <span>Real conversations</span><span aria-hidden="true">✦</span>
              <span>Shared memories</span><span aria-hidden="true">✦</span>
              <span>Little surprises</span>
            </div>
          </div>

          <UniversePreview />
        </section>

        <section id="features" className="scroll-mt-20 border-y border-white/[0.07] bg-black/15 px-4 py-16 sm:px-8 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ffbdd1]">The things you share</p>
            <h2 className="mt-3 max-w-xl font-display text-4xl font-semibold leading-tight text-white sm:text-5xl">
              More than another place to message.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-pink-100/70">
              A home for the everyday conversations and the moments worth keeping.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {features.map(({ icon: Icon, eyebrow, title, description }) => (
                <article key={title} className="rounded-[24px] border border-white/10 bg-white/[0.035] p-6 transition hover:border-[#ffc2d6]/35 hover:bg-white/[0.06]">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#ffc2d6]/10 text-[#ffc2d6]"><Icon size={20} aria-hidden="true" /></span>
                  <p className="mt-7 text-[10px] font-bold tracking-[0.2em] text-[#ffbed2]">{eyebrow}</p>
                  <h3 className="mt-2 font-display text-3xl leading-tight text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-pink-100/70">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-16 sm:px-8 lg:py-24">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ffbdd1]">Only three small steps</p>
              <h2 className="mt-3 font-display text-4xl font-semibold leading-tight text-white sm:text-5xl">Your little world begins here.</h2>
              <p className="mt-4 text-sm leading-7 text-pink-100/70">No public profiles or feeds. It's a shared space you create together.</p>
            </div>
            <ol className="space-y-3">
              {[
                ['01', 'Create your space', 'Set up your account and start a new private universe.'],
                ['02', 'Invite your favourite person', 'Share the couple code with your partner so they can join.'],
                ['03', 'Make it yours', 'Start a conversation, leave a letter, or add your first star.'],
              ].map(([number, title, description]) => (
                <li key={number} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <span className="font-display text-3xl text-[#ffbed2]">{number}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-pink-100/65">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-8 lg:pb-24">
          <div className="mx-auto max-w-6xl rounded-[30px] border border-[#ffc2d6]/20 bg-[radial-gradient(circle_at_90%_10%,rgba(208,92,150,.25),transparent_46%),linear-gradient(135deg,#281629,#120e1e)] px-6 py-10 text-center sm:px-10 sm:py-14">
            <Heart className="mx-auto text-[#ffbdd1]" size={25} fill="currentColor" aria-hidden="true" />
            <h2 className="mx-auto mt-4 max-w-xl font-display text-4xl font-semibold leading-tight text-white sm:text-5xl">Some things deserve their own little universe.</h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-pink-100/75">You bring the person. We'll make room for the moments.</p>
            <Link to={primaryDestination} className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#ffc2d6] px-6 text-sm font-bold text-[#271426] transition hover:bg-[#ffe0e9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc2d6]">
              {primaryText} <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-6 text-xs text-pink-100/50 sm:px-8">
        <span>Our Hidden Universe · A private place for two</span>
        <a className="transition hover:text-white" href="#main-content">Back to top ↑</a>
      </footer>
    </PageShell>
  );
}
