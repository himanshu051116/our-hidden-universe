import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { deleteObject, listAll, ref } from 'firebase/storage';
import { db, firebaseEnabled, storage } from './firebase';

const demoKeys = [
  'ohu-demo-messages-v1',
  'ohu-memories-v1',
  'ohu-extras-v1',
  'ohu-couple-room',
  'ohu-couple-profile-v1',
  'ohu-read-together-v1',
  'ohu-watch-party-v1',
  'ohu-night-sky-v1',
  'ohu-now-photos-v1',
];

const collectionNames = [
  'messages',
  'memories',
  'openWhen',
  'bucketList',
  'readTogether',
  'watchParty',
  'skyStars',
  'skySignals',
  'moodLanterns',
  'sleepStates',
  'skyStats',
  'starTouches',
  'rightNowPhotos',
  'callHistory',
];

function clearLocalDemoState() {
  demoKeys.forEach((key) => localStorage.removeItem(key));
}

async function deleteCollection(coupleId, name) {
  const snapshot = await getDocs(collection(db, 'couples', coupleId, name));
  await Promise.all(snapshot.docs.map((entry) => deleteDoc(doc(db, 'couples', coupleId, name, entry.id))));
  return snapshot.size;
}

async function deleteCallData(coupleId) {
  const calls = await getDocs(collection(db, 'couples', coupleId, 'calls'));
  let deleted = 0;

  for (const call of calls.docs) {
    for (const candidateCollection of ['callerCandidates', 'calleeCandidates']) {
      const candidates = await getDocs(
        collection(db, 'couples', coupleId, 'calls', call.id, candidateCollection),
      );
      await Promise.all(candidates.docs.map((candidate) => deleteDoc(candidate.ref)));
      deleted += candidates.size;
    }

    await deleteDoc(call.ref);
    deleted += 1;
  }

  return deleted;
}

async function deleteStorageFolder(folderPath) {
  if (!storage) return 0;
  const folderRef = ref(storage, folderPath);
  let totalDeleted = 0;

  async function walk(currentRef) {
    const result = await listAll(currentRef);
    await Promise.all(
      result.items.map(async (itemRef) => {
        await deleteObject(itemRef);
        totalDeleted += 1;
      }),
    );
    for (const child of result.prefixes) {
      await walk(child);
    }
  }

  await walk(folderRef);
  return totalDeleted;
}

export async function resetCoupleData(coupleId) {
  clearLocalDemoState();

  if (!firebaseEnabled || !coupleId) {
    return { deletedDocs: 0, deletedFiles: 0, mode: 'local' };
  }

  let deletedDocs = 0;

  for (const name of collectionNames) {
    deletedDocs += await deleteCollection(coupleId, name);
  }

  deletedDocs += await deleteCallData(coupleId);

  const deletedFiles = await deleteStorageFolder(`couples/${coupleId}`);
  return { deletedDocs, deletedFiles, mode: 'firebase' };
}
