import { motion } from 'framer-motion';
import { HeartHandshake, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageShell from '../components/PageShell.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', accessCode: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.email.trim(), form.password, form.accessCode, mode);
      navigate('/universe');
    } catch (submitError) {
      setError(submitError.message || 'Unable to access this universe.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell className="grid place-items-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass w-full max-w-md rounded-3xl p-6 sm:p-8"
      >
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-roseGold">
          <ShieldCheck size={14} />
          Secure Access
        </p>
        <h1 className="mt-2 font-display text-4xl text-white">Enter your hidden universe</h1>
        <p className="mt-2 text-sm text-pink-100/80">
          Create a private couple room or join one using the shared couple code.
        </p>

        <div className="mt-4 flex rounded-full bg-black/35 p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 rounded-full px-4 py-2 text-sm transition ${mode === 'login' ? 'bg-blush text-midnight' : 'text-pink-100'}`}
          >
            Join room
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 rounded-full px-4 py-2 text-sm transition ${mode === 'signup' ? 'bg-blush text-midnight' : 'text-pink-100'}`}
          >
            Create room
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1 inline-flex items-center gap-2 text-xs text-pink-100/80">
              <Mail size={12} />
              Email
            </span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-blush/70"
              placeholder="you@love.com"
            />
            {mode === 'login' ? (
              <p className="mt-1 text-[11px] text-pink-100/60">Use your own email. If it is new, we will create your partner account in this room.</p>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 inline-flex items-center gap-2 text-xs text-pink-100/80">
              <HeartHandshake size={12} />
              Password
            </span>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(event) => setForm((previous) => ({ ...previous, password: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-blush/70"
              placeholder="At least 6 characters"
            />
          </label>

          <label className="block">
            <span className="mb-1 inline-flex items-center gap-2 text-xs text-pink-100/80">
              <KeyRound size={12} />
              {mode === 'signup' ? 'Couple code (optional)' : 'Couple code'}
            </span>
            <input
              type="text"
              required={mode !== 'signup'}
              value={form.accessCode}
              onChange={(event) => setForm((previous) => ({ ...previous, accessCode: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-blush/70"
              placeholder={mode === 'signup' ? 'Leave blank to generate one' : 'Enter the code your partner shared'}
            />
            {mode === 'signup' ? (
              <p className="mt-1 text-[11px] text-pink-100/60">If you leave this blank, we will generate a unique code for you.</p>
            ) : null}
          </label>

          {error ? <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-gradient-to-r from-blush to-roseGold px-5 py-3 text-sm font-semibold text-midnight transition hover:brightness-105 disabled:opacity-70"
          >
            {busy ? 'Working...' : mode === 'login' ? 'Join Room' : 'Create Room'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-pink-100/70">
          <Link className="underline underline-offset-4 hover:text-white" to="/">
            Back to cinematic landing
          </Link>
        </p>
      </motion.div>
    </PageShell>
  );
}
