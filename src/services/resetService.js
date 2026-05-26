import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { deleteObject, listAll, ref } from 'firebase/storage';
import { db, firebaseEnabled, storage } from './firebase';

const demoKeys = ['ohu-demo-messages-v1', 'ohu-memories-v1', 'ohu-extras-v1'];
const collectionNames = ['messages', 'memories', 'openWhen', 'bucketList'];

function clearLocalDemoState() {
  demoKeys.forEach((key) => localStorage.removeItem(key));
}

async function deleteCollection(coupleId, name) {
  const snapshot = await getDocs(collection(db, 'couples', coupleId, name));
  await Promise.all(snapshot.docs.map((entry) => deleteDoc(doc(db, 'couples', coupleId, name, entry.id))));
  return snapshot.size;
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

  const deletedFiles = await deleteStorageFolder(`couples/${coupleId}`);
  return { deletedDocs, deletedFiles, mode: 'firebase' };
}
