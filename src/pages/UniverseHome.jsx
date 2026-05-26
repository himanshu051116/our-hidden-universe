import { motion } from 'framer-motion';
import { Heart, MessageCircleHeart, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function UniverseHome() {
  return (
    <div className="space-y-5">
      <section className="glass relative min-h-[380px] overflow-hidden rounded-3xl p-5 sm:p-8">
        <SolarSystemBackground />
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-roseGold">Home</p>
          <h2 className="mt-2 max-w-2xl font-display text-4xl text-white sm:text-5xl">
            Welcome back to your hidden universe
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-pink-100/85 sm:text-base">
            The sun and earth stay apart in orbit, yet forever connected, just like two hearts in long distance.
          </p>

          <p className="mt-3 inline-flex rounded-full border border-white/20 bg-black/25 px-4 py-2 text-xs text-pink-100/80">
            Earth orbit distance shown: 149.6 million km
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <QuickLink to="/universe/chat" icon={<MessageCircleHeart size={16} />} title="Private Chat" text="Send encrypted notes, voice, and reaction moments." />
        <QuickLink to="/universe/timeline" icon={<Timer size={16} />} title="Memory Timeline" text="Keep your shared milestones and photos in one place." />
        <QuickLink to="/universe/open-when" icon={<Heart size={16} />} title="Open When" text="Emotional comfort vault for every kind of day." />
      </section>
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

function SolarSystemBackground() {
  const orbitColor = 'rgba(255, 182, 200, 0.55)';
  const orbitSoft = 'rgba(255, 182, 200, 0.22)';

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
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

      <div className="absolute right-[-24px] top-1/2 h-[clamp(250px,48vw,430px)] w-[clamp(250px,48vw,430px)] -translate-y-1/2 sm:right-2 md:right-8">
        <motion.div
          className="absolute inset-0 rounded-full border border-dashed"
          style={{ borderColor: orbitColor, boxShadow: `0 0 26px ${orbitSoft}` }}
          animate={{ scale: [1, 1.01, 1], opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="absolute inset-[15%] rounded-full border border-white/10" />

        <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_35%_35%,#fff6bc_6%,#ffd76a_35%,#ff9f2f_68%,#f16b1f_100%)] shadow-[0_0_55px_rgba(255,170,80,.8)]" />

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

        <div className="absolute right-14 top-1/2 -translate-y-[52px] rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-pink-100/80">
          Earth
        </div>
        <div className="absolute left-1/2 top-1/2 translate-x-2 translate-y-9 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-pink-100/80">
          Sun
        </div>
      </div>
    </div>
  );
}
