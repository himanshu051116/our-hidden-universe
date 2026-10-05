import { motion } from 'framer-motion';
import { ArrowRight, Clapperboard, HeartHandshake, Lock, MessageCircleHeart, Stars } from 'lucide-react';
import { Link } from 'react-router-dom';
import AmbientMusicToggle from '../components/AmbientMusicToggle.jsx';
import FloatingHeart from '../components/FloatingHeart.jsx';
import GlowButton from '../components/GlowButton.jsx';
import PageShell from '../components/PageShell.jsx';
import Typewriter from '../components/Typewriter.jsx';

const welcome = 'Distance means so little when someone means so much.';

export default function Landing() {
  return (
    <PageShell>
      <section className="relative flex min-h-screen items-center px-4 pb-14 pt-24 sm:px-8">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <AmbientMusicToggle className="mb-6" />
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xs uppercase tracking-[0.24em] text-roseGold"
            >
              Our Hidden Universe
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75 }}
              className="mt-4 max-w-xl font-display text-5xl leading-tight text-white sm:text-6xl"
            >
              A private universe and secret space for couples.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-5 max-w-2xl text-lg text-pink-100/85"
            >
              Stay close through private chat, shared memories, Watch Together, Open When letters, and a living Night Sky made for two.{' '}
              <span className="block pt-2 text-base text-blush">
                <Typewriter text={welcome} />
              </span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link to="/login">
                <GlowButton className="inline-flex items-center gap-2">
                  Enter Our Universe
                  <ArrowRight size={16} />
                </GlowButton>
              </Link>
              <a href="#story" className="rounded-full border border-white/15 px-5 py-3 text-sm text-pink-100 transition hover:border-blush/60">
                See what you can share
              </a>
            </motion.div>
          </div>

          <div className="flex items-center justify-center">
            <FloatingHeart />
          </div>
        </div>
      </section>

      <section id="story" className="px-4 pb-16 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {[
            {
              icon: <Lock size={16} />,
              title: 'Private access',
              text: 'Authentication, a couple code, and encrypted chat keep the shared space personal to you both.',
            },
            {
              icon: <MessageCircleHeart size={16} />,
              title: 'Stay connected',
              text: 'Real-time chat, voice notes, images, calls, reactions, typing, and seen indicators.',
            },
            {
              icon: <Stars size={16} />,
              title: 'Keep your story together',
              text: 'Shared memories, Open When letters, a couple bucket list, reading progress, and your Night Sky.',
            },
          ].map((item, index) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              viewport={{ once: true }}
              className="glass rounded-3xl p-5"
            >
              <p className="inline-flex items-center gap-2 text-sm text-roseGold">
                {item.icon}
                {item.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-pink-100/82">{item.text}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-black/30 p-5 sm:p-8">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.22em] text-roseGold">A secret space made for two</p>
            <h2 className="mt-3 font-display text-3xl text-white sm:text-4xl">
              More than a messenger: one private place for the moments you share.
            </h2>
            <p className="mt-4 text-sm leading-7 text-pink-100/80 sm:text-base">
              OHS brings conversations, synchronized activities, shared memories, letters, rituals, and your relationship’s Night Sky into one private universe. It is especially useful when distance makes ordinary shared moments harder to keep in one place.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <MessageCircleHeart size={18} className="text-blush" />
              <h3 className="mt-3 font-display text-2xl text-white">Private couple chat</h3>
              <p className="mt-2 text-sm leading-6 text-pink-100/75">
                Share encrypted messages, photos, voice notes, reactions, and presence inside your universe.
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <Clapperboard size={18} className="text-blush" />
              <h3 className="mt-3 font-display text-2xl text-white">Watch Together</h3>
              <p className="mt-2 text-sm leading-6 text-pink-100/75">
                Use synchronized playback for supported players, or a shared countdown and position when a streaming service opens separately.
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <HeartHandshake size={18} className="text-blush" />
              <h3 className="mt-3 font-display text-2xl text-white">Shared relationship space</h3>
              <p className="mt-2 text-sm leading-6 text-pink-100/75">
                Keep shared memories, a living Night Sky, Open When letters, a bucket list, and reading progress in one romantic home.
              </p>
            </article>
          </div>
        </div>
      </section>
    </PageShell>
  );
}