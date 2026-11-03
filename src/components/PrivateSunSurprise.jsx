import { motion } from 'framer-motion';
import { Heart, LockKeyhole, ShieldCheck, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { watchPrivateSurprise, savePrivateSurprise } from '../services/privateSurpriseService.js';
import { db } from '../services/firebaseCore.js';
import { doc, getDoc } from 'firebase/firestore';

export default function PrivateSunSurprise({ onClose }) {
  const { user, coupleId } = useAuth();
  const [secret, setSecret] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [image, setImage] = useState(null);
  const [creator, setCreator] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!unlocked || !user?.uid || !coupleId) return undefined;
    let active = true;
    setLoading(true);

    getDoc(doc(db, 'couples', coupleId))
      .then((snapshot) => { if (active) setCreator(snapshot.data()?.createdBy === user.uid); })
      .catch(() => { if (active) setCreator(false); });

    const unsubscribe = watchPrivateSurprise(
      coupleId,
      (data) => {
        if (!active) return;
        setImage(data);
        setLoading(false);
        setError('');
      },
      () => {
        if (!active) return;
        setLoading(false);
        setError('The private surprise could not be loaded. Firestore member rules may need publishing.');
      },
    );
    return () => { active = false; unsubscribe?.(); };
  }, [unlocked, coupleId, user?.uid]);

  function unlock(event) {
    event.preventDefault();
    // A romantic reveal only. Firestore membership, not this word,
    // is the actual authorization boundary around the image.
    if (secret.trim().toLowerCase() !== 'jaan') {
      setError('That is not the secret word yet.');
      return;
    }
    setError('');
    setUnlocked(true);
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || uploading) return;
    setUploading(true);
    setError('');
    setNotice('');
    try {
      await savePrivateSurprise(coupleId, user?.uid, file);
      setNotice('Your new surprise is saved for this universe.');
    } catch (problem) {
      setError(problem?.message || 'Could not save this image to the private universe.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 px-4 py-6 backdrop-blur-sm" role="presentation">
      <motion.section
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        role="dialog"
        aria-modal="true"
        aria-label="Sun surprise"
        className="glass relative w-full max-w-lg rounded-3xl p-5 sm:p-6"
      >
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full border border-white/15 p-2 text-pink-100 hover:border-blush/70" aria-label="Close secret">
          <X size={16} />
        </button>

        {!unlocked ? (
          <form onSubmit={unlock} className="pr-8">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-roseGold"><Heart size={13} /> Sun secret</p>
            <h2 className="mt-2 font-display text-3xl text-white">The sun is holding something for you.</h2>
            <p className="mt-2 text-sm text-pink-100/70">Enter the secret word to reveal your member-only surprise.</p>
            <input type="password" autoFocus value={secret} onChange={(e) => { setSecret(e.target.value); setError(''); }}
              className="mt-5 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-blush/70" placeholder="Secret word"/>
            <button type="submit" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-5 py-2.5 text-sm font-semibold text-midnight">
              <LockKeyhole size={15}/> Reveal
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-roseGold"><ShieldCheck size={15}/> Private surprise</p>
            {loading ? <p role="status" className="text-sm text-pink-100/65">Opening your member-only surprise…</p>
              : image ? (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/35">
                  <img src={image} alt="Your private surprise" className="max-h-[65vh] w-full object-contain"/>
                  <p className="p-3 text-center font-display text-2xl text-white">Forever yours</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/20 bg-white/[0.03] p-6 text-center">
                  <Heart size={28} className="mx-auto text-blush" />
                  <h3 className="mt-3 font-display text-2xl text-white">A new secret is waiting.</h3>
                  <p className="mt-2 text-xs leading-5 text-pink-100/70">Upload a fresh photo below. The previously public picture cannot be considered private.</p>
                </div>
              )}
            {creator ? (
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-blush/40 bg-blush/10 px-4 text-xs font-semibold text-blush">
                <Upload size={15} /> {uploading ? 'Saving privately…' : image ? 'Replace private photo' : 'Add a private photo'}
                <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden"/>
              </label>
            ) : !image && !loading ? (
              <p className="text-xs text-pink-100/65">The universe creator can add the private photo here.</p>
            ) : null}
            <p className="text-xs leading-5 text-pink-100/55">The image is retrieved from member-only Firestore data, not a public website asset. The secret word is only a reveal gesture.</p>
          </div>
        )}
        {error ? <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">{error}</p> : null}
        {notice ? <p role="status" className="mt-3 text-xs text-emerald-200">{notice}</p> : null}
      </motion.section>
    </div>
  );
}
