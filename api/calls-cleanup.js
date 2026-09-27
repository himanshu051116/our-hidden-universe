import { getAdminServices } from './_firebaseAdmin.js';

function authorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.authorization === `Bearer ${secret}`;
}

async function deleteSubcollection(ref, name) {
  const snapshot = await ref.collection(name).get();
  await Promise.all(snapshot.docs.map((entry) => entry.ref.delete()));
  return snapshot.size;
}

export default async function handler(request, response) {
  if (!authorized(request)) {
    response.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const { db } = getAdminServices();

    const snapshot = await db
      .collectionGroup('calls')
      .where('expiresAt', '<', new Date())
      .limit(100)
      .get();

    let cleaned = 0;
    let histories = 0;

    for (const entry of snapshot.docs) {
      const call = entry.data();

      // Answered calls clear expiresAt. This endpoint is only a safety net for
      // abandoned setup/ringing documents.
      if (!['creating', 'ringing', 'missed', 'declined', 'failed', 'ended'].includes(call.status)) {
        continue;
      }

      const coupleRef = entry.ref.parent.parent;
      if (!coupleRef) continue;

      if (
        call.callerId
        && call.calleeId
        && ['creating', 'ringing'].includes(call.status)
      ) {
        const result = call.status === 'ringing' ? 'missed' : 'failed';
        await coupleRef.collection('callHistory').doc(entry.id).set(
          {
            callerId: call.callerId,
            calleeId: call.calleeId,
            type: call.type === 'audio' ? 'audio' : 'video',
            result,
            startedAt: call.createdAt || null,
            connectedAt: null,
            durationSeconds: 0,
            endedAt: new Date(),
          },
          { merge: true },
        );
        histories += 1;
      }

      await deleteSubcollection(entry.ref, 'callerCandidates');
      await deleteSubcollection(entry.ref, 'calleeCandidates');
      await entry.ref.delete();
      cleaned += 1;
    }

    response.status(200).json({ cleaned, histories });
  } catch (error) {
    console.error('Call cleanup failed:', error?.message || error);
    response.status(500).json({ error: 'Cleanup failed.' });
  }
}
