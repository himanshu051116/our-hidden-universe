import { FieldValue } from 'firebase-admin/firestore';
import { getAdminServices } from './_firebaseAdmin.js';

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

function normalizeCoupleCode(value) {
  return String(value ?? '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .trim();
}

function formatCoupleCode(code) {
  const normalized = normalizeCoupleCode(code);
  return normalized.match(/.{1,4}/g)?.join('-') || normalized;
}

function cleanDisplayName(value, fallback) {
  const normalized = String(value || fallback || 'You').trim();
  return normalized.slice(0, 120) || 'You';
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const authHeader = request.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) throw new HttpError(401, 'Unauthorized');

    const payload = parseBody(request.body);
    const mode = payload.mode === 'signup' ? 'signup' : 'login';
    const coupleId = normalizeCoupleCode(payload.coupleCode);

    if (!coupleId || coupleId.length < 4 || coupleId.length > 64) {
      throw new HttpError(400, 'Enter a valid couple code.');
    }

    const { auth, db } = getAdminServices();
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const displayName = cleanDisplayName(payload.displayName, decoded.name || decoded.email);

    const roomRef = db.doc(`couples/${coupleId}`);
    const memberRef = roomRef.collection('members').doc(uid);

    const result = await db.runTransaction(async (transaction) => {
      const roomSnapshot = await transaction.get(roomRef);

      if (mode === 'signup') {
        if (roomSnapshot.exists) {
          throw new HttpError(409, 'That couple code is already taken. Please create a different one.');
        }

        const now = FieldValue.serverTimestamp();
        transaction.set(roomRef, {
          code: coupleId,
          displayCode: formatCoupleCode(coupleId),
          createdBy: uid,
          createdAt: now,
          updatedAt: now,
          memberIds: [uid],
          memberCount: 1,
        });
        transaction.set(memberRef, {
          joinedAt: now,
          role: 'creator',
          lastActiveAt: now,
          displayName,
        });

        return { role: 'creator', memberCount: 1 };
      }

      if (!roomSnapshot.exists) {
        throw new HttpError(404, 'No private room was found for that couple code.');
      }

      // Read member documents inside the transaction so a simultaneous join cannot
      // race past the two-person limit. Legacy rooms may not have memberIds yet.
      const membersSnapshot = await transaction.get(roomRef.collection('members').limit(3));
      const room = roomSnapshot.data() || {};
      const memberDocs = membersSnapshot.docs.map((entry) => entry.id);
      const roomMemberIds = Array.isArray(room.memberIds) ? room.memberIds : [];
      let memberIds = [...new Set([room.createdBy, ...roomMemberIds, ...memberDocs].filter(Boolean))];
      const memberSnapshot = membersSnapshot.docs.find((entry) => entry.id === uid);
      const alreadyMember = memberIds.includes(uid) || Boolean(memberSnapshot);

      if (memberIds.length > 2) {
        throw new HttpError(409, 'This private room has inconsistent membership data.');
      }

      if (!alreadyMember && memberIds.length >= 2) {
        throw new HttpError(403, 'This private room already has two members.');
      }

      if (!memberIds.includes(uid)) memberIds.push(uid);

      const role = room.createdBy === uid ? 'creator' : 'partner';
      const now = FieldValue.serverTimestamp();

      transaction.set(
        roomRef,
        {
          memberIds,
          memberCount: memberIds.length,
          updatedAt: now,
        },
        { merge: true },
      );

      if (memberSnapshot) {
        transaction.update(memberRef, {
          lastActiveAt: now,
          displayName,
        });
      } else {
        transaction.set(memberRef, {
          joinedAt: now,
          role,
          lastActiveAt: now,
          displayName,
        });
      }

      return { role, memberCount: memberIds.length };
    });

    response.status(200).json({
      ok: true,
      coupleId,
      role: result.role,
      memberCount: result.memberCount,
    });
  } catch (error) {
    const code = String(error?.code || '');
    if (code.startsWith('auth/')) {
      response.status(401).json({ error: 'Invalid or expired Firebase session.' });
      return;
    }

    const status = Number.isInteger(error?.status) ? error.status : 500;
    if (status >= 500) {
      console.error('Room membership failed:', error?.message || error);
    }

    response.status(status).json({
      error: status >= 500 ? 'Unable to open the private room.' : error.message,
    });
  }
}
