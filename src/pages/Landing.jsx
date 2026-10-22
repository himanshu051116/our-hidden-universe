import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Heart,
  Lock,
  MessageCircleHeart,
  Play,
  Sparkles,
  Stars,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell.jsx';
import GuestUniverseDemo from '../components/GuestUniverseDemo.jsx';
import { useAuth } from '../context/AuthContext.jsx';

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

function MobileFirstLook() {
  return (
    <a
      href="#preview"
      aria-label="Explore the interactive chat, Night Sky, letters and movie preview"
      className="group relative mt-5 block overflow-hidden rounded-[22px] border border-[#ffc2d6]/20 bg-[#160e25] shadow-[0_16px_45px_rgba(0,0,0,.22)] transition hover:border-[#ffc2d6]/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc2d6] lg:hidden"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_18%,rgba(190,106,176,.25),transparent_50%)]" />
      <div className="relative grid grid-cols-[1.25fr_1fr] gap-2.5 p-3">
        <div className="min-w-0 space-y-1.5">
          <p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#ffbdd1]">A LITTLE LOOK INSIDE</p>
          <div className="max-w-[90%] rounded-xl rounded-bl-sm bg-white/10 px-2.5 py-2 text-[10px] text-white/85">
            Look at the moon tonight 🌙
          </div>
          <div className="ml-auto max-w-[95%] rounded-xl rounded-br-sm bg-[#e79ab8]/25 px-2.5 py-2 text-[10px] text-white">
            I wish you were here ❤️
          </div>
        </div>
        <div className="relative flex min-h-[95px] flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_70%_75%,#49314f,#111526_70%)] p-2.5">
          <p className="relative z-10 text-[9px] font-semibold tracking-[.14em] text-[#ffd2e0]">OUR NIGHT SKY</p>
          <div aria-hidden="true" className="relative z-10 text-center text-lg tracking-[.4em] text-[#ffe1ed]">✦ · ✧</div>
          <p className="relative z-10 text-[9px] text-pink-100/75">A star for every memory</p>
        </div>
      </div>
      <div className="relative flex items-center justify-between border-t border-white/10 bg-white/[.03] px-3 py-2 text-[10px] font-semibold text-[#ffcedd]">
        <span>Try four little experiences</span>
        <ArrowRight size={14} className="transition group-hover:translate-x-1" aria-hidden="true" />
      </div>
    </a>
  );
}

export default function Landing() {
  const { user, coupleCode } = useAuth();
  const hasUniverse = Boolean(user && coupleCode);
  const primaryDestination = hasUniverse ? '/universe/home' : '/login?mode=signup';
  const primaryText = hasUniverse ? 'Open your universe' : 'Create our space';

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

      <div id="main-content">
        <section className="relative mx-auto grid w-full max-w-7xl items-center gap-9 px-4 pb-16 pt-7 sm:px-8 sm:pt-12 lg:grid-cols-[.96fr_1.04fr] lg:gap-12 lg:px-10 lg:pb-28 lg:pt-16">
          <div className="relative z-10">
            <motion.p
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="inline-flex items-center gap-2 rounded-full border border-[#ffc2d6]/20 bg-[#ffc2d6]/[0.07] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.17em] text-[#ffc2d6] sm:text-xs"
            >
              <Sparkles size={14} aria-hidden="true" />
              A little world, just for two
            </motion.p>
            <motion.h1
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.07 }}
              className="mt-5 max-w-[640px] font-display text-[clamp(2.85rem,6vw,5.4rem)] font-semibold leading-[.99] tracking-[-0.025em] text-white"
            >
              Feel closer, <span className="text-[#ffbbd2]">even from miles away.</span>
            </motion.h1>
            <MobileFirstLook />
            <motion.p
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.14 }}
              className="mt-4 max-w-lg text-sm leading-7 text-pink-100/80 sm:mt-5 sm:text-base sm:leading-8"
            >
              A private space to talk, watch something together, save your favourite memories, and leave little surprises for each other.
            </motion.p>

            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="mt-5 flex flex-wrap items-center gap-2.5 sm:mt-7 sm:gap-3"
            >
              <Link
                to={primaryDestination}
                className="inline-flex min-h-12 flex-[1.3] items-center justify-center gap-2 rounded-full bg-[#ffc2d6] px-3.5 sm:px-6 text-sm font-bold text-[#271426] shadow-[0_10px_35px_rgba(255,182,200,.2)] transition hover:-translate-y-0.5 hover:bg-[#ffe0e9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc2d6] sm:flex-none"
              >
                {primaryText}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <a
                href="#preview"
                className="inline-flex min-h-12 flex-[0.7] items-center justify-center gap-2 rounded-full border border-white/20 px-3 sm:px-6 text-sm font-semibold text-pink-100 transition hover:border-[#ffc2d6]/60 hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc2d6] sm:w-auto"
              >
                <Play size={15} aria-hidden="true" />
                <span className="sm:hidden">Preview</span>
                <span className="hidden sm:inline">Try the preview</span>
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

          <GuestUniverseDemo />
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
      </div>

      <footer className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-6 text-xs text-pink-100/50 sm:px-8">
        <span>Our Hidden Universe · A private place for two</span>
        <a className="transition hover:text-white" href="#main-content">Back to top ↑</a>
      </footer>
    </PageShell>
  );
}
