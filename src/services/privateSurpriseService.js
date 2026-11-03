import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase.js';
import { isValidSurpriseData, optimizeSurpriseImage } from './privateSurpriseMedia.js';

export function watchPrivateSurprise(coupleId, onChange, onError) {
  if (!coupleId) return () => {};
  return onSnapshot(
    doc(db, 'couples', coupleId, 'surprises', 'sun'),
    (snapshot) => {
      const image = snapshot.exists() ? snapshot.data()?.imageData : null;
      onChange(isValidSurpriseData(image) ? image : null);
    },
    (error) => onError?.(error),
  );
}

export async function savePrivateSurprise(coupleId, uid, file) {
  if (!coupleId || !uid) throw new Error('Sign in to your universe first.');
  const imageData = await optimizeSurpriseImage(file);
  await setDoc(doc(db, 'couples', coupleId, 'surprises', 'sun'), {
    imageData,
    uploadedBy: uid,
    updatedAt: serverTimestamp(),
  });
}
