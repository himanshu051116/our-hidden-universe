import { motion } from 'framer-motion';
import { Heart, LockKeyhole, MessageCircleHeart, Timer, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const sunSecretPassword = 'jaan';
const sunSurpriseImage = '/secret-sun-surprise.jpeg';

export default function UniverseHome() {
  const [sunSecretOpen, setSunSecretOpen] = useState(false);
  const [sunSecretUnlocked, setSunSecretUnlocked] = useState(false);
  const [sunPassword, setSunPassword] = useState('');
  const [sunError, setSunError] = useState('');

  function openSunSecret() {
    setSunSecretOpen(true);
    setSunError('');
  }

  function unlockSunSecret(event) {
    event.preventDefault();
    if (sunPassword.trim().toLowerCase() !== sunSecretPassword) {
      setSunError('That is not the secret word yet.');
      return;
    }
    setSunSecretUnlocked(true);
    setSunError('');
  }

  function closeSunSecret() {
    setSunSecretOpen(false);
    setSunSecretUnlocked(false);
    setSunPassword('');
    setSunError('');
  }

  return (
    <div className="space-y-5">
      <section className="glass relative min-h-[560px] overflow-hidden rounded-3xl p-5 sm:min-h-[430px] sm:p-8">
        <SolarSystemBackground onSunSecretClick={openSunSecret} active={sunSecretOpen} />
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-roseGold">Home</p>
          <h2 className="mt-2 max-w-2xl font-display text-[2.35rem] leading-tight text-white sm:text-5xl">
            Welcome back to your hidden universe
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-pink-100/85 sm:text-base">
            The sun and earth stay apart in orbit, yet forever connected, just like two hearts in long distance.
          </p>

          <p className="mt-3 inline-flex max-w-full rounded-full border border-white/20 bg-black/25 px-4 py-2 text-xs leading-relaxed text-pink-100/80">
            Earth orbit distance shown: 149.6 million km
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <QuickLink to="/universe/chat" icon={<MessageCircleHeart size={16} />} title="Private Chat" text="Send encrypted notes, voice, and reaction moments." />
        <QuickLink to="/universe/timeline" icon={<Timer size={16} />} title="Memory Timeline" text="Keep your shared milestones and photos in one place." />
        <QuickLink to="/universe/open-when" icon={<Heart size={16} />} title="Open When" text="Emotional comfort vault for every kind of day." />
      </section>

      {sunSecretOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 px-4 py-6 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="glass relative w-full max-w-lg rounded-3xl p-5 sm:p-6"
          >
            <button
              type="button"
              onClick={closeSunSecret}
              className="absolute right-4 top-4 rounded-full border border-white/15 p-2 text-pink-100 transition hover:border-blush/70 hover:text-white"
              aria-label="Close secret"
            >
              <X size={16} />
            </button>

            {!sunSecretUnlocked ? (
              <form onSubmit={unlockSunSecret} className="pr-8">
                <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-roseGold">
                  <LockKeyhole size={13} />
                  Sun secret
                </p>
                <h3 className="mt-2 font-display text-3xl text-white">A hidden heart is awake</h3>
                <p className="mt-2 text-sm text-pink-100/75">Enter the secret password to open what the sun is holding.</p>

                <input
                  type="password"
                  autoFocus
                  value={sunPassword}
                  onChange={(event) => {
                    setSunPassword(event.target.value);
                    setSunError('');
                  }}
                  className="mt-5 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-blush/70"
                  placeholder="Password"
                />
                {sunError ? <p className="mt-2 text-xs text-red-200">{sunError}</p> : null}

                <button
                  type="submit"
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-5 py-2.5 text-sm font-semibold text-midnight transition hover:brightness-105"
                >
                  <Heart size={15} />
                  Unlock
                </button>
              </form>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/35">
                <div className="relative">
                  <img src={sunSurpriseImage} alt="Forever yours Jaan" className="max-h-[72vh] w-full object-contain" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-5 pb-5 pt-16 text-center">
                    <p className="font-display text-3xl text-white drop-shadow sm:text-5xl">Forever yours Jaan</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}

function QuickLink({ to, icon, title, text }) {
  return (
    <Link to={to} className="glass rounded-3xl p-5 transition hover:-translate-y-0.5">
      <p className="inline-flex items-center gap-2 text-sm text-roseGold">
        {icon}
        {title}
      </p>
      <p className="mt-2 text-sm text-pink-100/85">{text}</p>
    </Link>
  );
}

function SolarSystemBackground({ onSunSecretClick, active }) {
  const orbitColor = 'rgba(255, 182, 200, 0.55)';
  const orbitSoft = 'rgba(255, 182, 200, 0.22)';

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[350px] overflow-hidden sm:inset-0 sm:h-auto">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,.08),transparent_26%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,.06),transparent_34%)]" />

      {Array.from({ length: 26 }).map((_, index) => (
        <motion.div
          key={index}
          className="absolute h-1.5 w-1.5 rounded-full bg-white/70"
          style={{
            left: `${4 + (index * 11) % 96}%`,
            top: `${6 + (index * 17) % 86}%`,
          }}
          animate={{ opacity: [0.2, 0.95, 0.2], y: [0, -4, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 3 + (index % 5), repeat: Infinity, delay: index * 0.08 }}
        />
      ))}

      <div className="absolute left-1/2 top-[56%] h-[min(82vw,330px)] w-[min(82vw,330px)] -translate-x-1/2 -translate-y-1/2 sm:left-auto sm:right-2 sm:top-1/2 sm:h-[clamp(250px,48vw,430px)] sm:w-[clamp(250px,48vw,430px)] sm:translate-x-0 md:right-8">
        <motion.div
          className="absolute inset-0 rounded-full border border-dashed"
          style={{ borderColor: orbitColor, boxShadow: `0 0 26px ${orbitSoft}` }}
          animate={{ scale: [1, 1.01, 1], opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="absolute inset-[15%] rounded-full border border-white/10" />

        <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_35%_35%,#fff6bc_6%,#ffd76a_35%,#ff9f2f_68%,#f16b1f_100%)] shadow-[0_0_55px_rgba(255,170,80,.8)]" />
        <button
          type="button"
          onClick={onSunSecretClick}
          className="pointer-events-auto absolute left-1/2 top-1/2 z-30 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-blush opacity-0 outline-none transition focus-visible:opacity-100 active:opacity-80"
          aria-label="Open hidden sun heart"
        >
          <Heart size={28} fill="currentColor" />
        </button>
        {active ? (
          <motion.div
            className="absolute left-1/2 top-1/2 z-10 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-blush"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: [1, 1.12, 1] }}
            transition={{ duration: 1.1, repeat: Infinity }}
          >
            <Heart size={28} fill="currentColor" />
          </motion.div>
        ) : null}

        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          <div
            className="absolute left-1/2 top-1/2 h-[1px] w-[42%] -translate-y-1/2 origin-left"
            style={{ background: `linear-gradient(90deg, ${orbitColor}, transparent)` }}
          />

          <motion.div
            className="absolute left-[92%] top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_30%_30%,#a4dcff_8%,#5da9ff_45%,#356fd6_85%)] shadow-[0_0_24px_rgba(124,191,255,.65)]"
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
        </motion.div>

        <div className="absolute right-10 top-1/2 -translate-y-[52px] rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-pink-100/80 sm:right-14">
          Earth
        </div>
        <div className="absolute left-1/2 top-1/2 translate-x-2 translate-y-9 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-pink-100/80">
          Sun
        </div>
      </div>
    </div>
  );
}
