import { getAdminServices } from './_firebaseAdmin.js';
import { classifyCallForCleanup } from './_callCleanupPolicy.js';

// Legacy production signaling uses /watchParty, not /calls.
// This cron is a bounded safety net; live call cleanup remains client-driven.
const MAX_COUPLES_PER_RUN = 75;
const MAX_CALLS_PER_COUPLE = 100;

function authorized(request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.authorization === `Bearer ${secret}`);
}

async function removeCandidates(coupleRef, callId) {
  const snapshot = await coupleRef.collection('watchParty')
    .where('callId', '==', callId).get();
  const refs = snapshot.docs.filter((entry) => entry.data()._kind === 'callCandidate');
  // Firestore allows at most 500 writes per batch. Chunk defensively.
  for (let i = 0; i < refs.length; i += 400) {
    const batch = coupleRef.firestore.batch();
    refs.slice(i, i + 400).forEach((entry) => batch.delete(entry.ref));
    await batch.commit();
  }
  return refs.length;
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!authorized(request)) {
    response.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const { db } = getAdminServices();
    const now = Date.now();
    let cleaned = 0;
    let histories = 0;
    let candidatesRemoved = 0;
    let couplesScanned = 0;

    let query = db.collection('couples').orderBy('__name__').limit(25);
    while (couplesScanned < MAX_COUPLES_PER_RUN) {
      const couples = await query.get();
      if (couples.empty) break;
      for (const couple of couples.docs) {
        couplesScanned++;
        const calls = await couple.ref.collection('watchParty')
          .where('_kind', '==', 'call').limit(MAX_CALLS_PER_COUPLE).get();
        for (const entry of calls.docs) {
          const call = entry.data();
          const policy = classifyCallForCleanup(call, now);
          if (!policy.remove) continue;
          if (policy.historyResult && call.callerId && call.calleeId) {
            await couple.ref.collection('watchParty').doc(`call-history-${entry.id}`).set({
              _kind: 'callHistory',
              callId: entry.id,
              callerId: call.callerId,
              calleeId: call.calleeId,
              type: call.type === 'audio' ? 'audio' : 'video',
              result: policy.historyResult,
              startedAt: call.createdAt || null,
              connectedAt: call.connectedAt || null,
              durationSeconds: 0,
              endedAt: new Date(now),
            }, { merge: true });
            histories++;
          }
          candidatesRemoved += await removeCandidates(couple.ref, entry.id);
          await entry.ref.delete();
          cleaned++;
        }
      }
      if (couples.size < 25 || couplesScanned >= MAX_COUPLES_PER_RUN) break;
      query = db.collection('couples').orderBy('__name__')
        .startAfter(couples.docs[couples.size - 1]).limit(25);
    }

    response.status(200).json({ cleaned, histories, candidatesRemoved, couplesScanned });
  } catch (error) {
    console.error('Call cleanup failed:', error?.message || error);
    response.status(500).json({ error: 'Cleanup failed.' });
  }
}
