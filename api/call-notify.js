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

function normalizedRoom(value) {
  return String(value || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function absoluteCallLink(request, callId) {
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  const host = request.headers.host;
  return `${protocol}://${host}/universe/chat?callId=${encodeURIComponent(callId)}`;
}

function staleTargetCode(code = '') {
  const value = String(code);
  return value.includes('registration-token-not-registered')
    || value.includes('invalid-registration-token')
    || value.includes('not-found')
    || value.includes('invalid-argument');
}

function targetFor(device) {
  if (device.targetType === 'fid') return { fid: device.targetId };
  return { token: device.targetId };
}

function memberName(snapshot) {
  const data = snapshot?.data?.() || {};
  return data.displayName || data.name || data.email || 'Your partner';
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
    if (!idToken) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { coupleId: rawCoupleId, callId } = parseBody(request.body);
    const coupleId = normalizedRoom(rawCoupleId);

    if (!coupleId || !callId) {
      response.status(400).json({ error: 'Missing call information.' });
      return;
    }

    const { auth, db, messaging } = getAdminServices();
    const decoded = await auth.verifyIdToken(idToken);

    const callRef = db.doc(`couples/${coupleId}/calls/${callId}`);
    const callSnapshot = await callRef.get();

    if (!callSnapshot.exists) {
      response.status(404).json({ error: 'Call not found.' });
      return;
    }

    const call = callSnapshot.data();

    if (call.callerId !== decoded.uid) {
      response.status(403).json({ error: 'Only the caller may notify this call.' });
      return;
    }

    if (call.status !== 'ringing') {
      response.status(409).json({ error: 'Call is not ringing.' });
      return;
    }

    if (call.expiresAt?.toMillis?.() <= Date.now()) {
      response.status(410).json({ error: 'Call has expired.' });
      return;
    }

    const [callerMember, calleeMember] = await Promise.all([
      db.doc(`couples/${coupleId}/members/${call.callerId}`).get(),
      db.doc(`couples/${coupleId}/members/${call.calleeId}`).get(),
    ]);

    if (!callerMember.exists || !calleeMember.exists) {
      response.status(403).json({ error: 'Call participants are not valid room members.' });
      return;
    }

    const devicesSnapshot = await db
      .collection(`couples/${coupleId}/members/${call.calleeId}/devices`)
      .where('enabled', '==', true)
      .get();

    const devices = devicesSnapshot.docs
      .map((entry) => ({ id: entry.id, ref: entry.ref, ...entry.data() }))
      .filter((device) =>
        typeof device.targetId === 'string'
        && device.targetId.length > 10
        && (device.targetType === 'fid' || device.targetType === 'token'),
      );

    if (!devices.length) {
      response.status(200).json({ delivered: 0, reason: 'no-registered-devices' });
      return;
    }

    const link = absoluteCallLink(request, callId);
    const callType = call.type === 'audio' ? 'audio' : 'video';
    const callerName = memberName(callerMember);
    const title = callType === 'audio' ? 'Incoming audio call' : 'Incoming video call';
    const body = `${callerName} is calling you.`;
    const expiresUnix = String(Math.floor(Date.now() / 1000) + 30);

    const messages = devices.map((device) => ({
      ...targetFor(device),
      notification: {
        title,
        body,
      },
      data: {
        type: 'incoming_call',
        coupleId,
        callId,
        callType,
        callerName,
      },
      android: {
        priority: 'high',
        ttl: 30000,
        notification: {
          channelId: 'calls',
          tag: `ohu-call-${callId}`,
          sound: 'default',
        },
      },
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-expiration': expiresUnix,
        },
        payload: {
          aps: {
            sound: 'default',
            category: 'incoming_call',
          },
        },
      },
      webpush: {
        headers: {
          TTL: '30',
          Urgency: 'high',
        },
        fcmOptions: {
          link,
        },
        notification: {
          tag: `ohu-call-${callId}`,
          requireInteraction: true,
          renotify: true,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
        },
      },
    }));

    const result = await messaging.sendEach(messages);

    const staleRefs = [];
    result.responses.forEach((item, index) => {
      if (!item.success && staleTargetCode(item.error?.code)) {
        staleRefs.push(devices[index].ref);
      }
    });

    await Promise.all(staleRefs.map((ref) => ref.delete().catch(() => {})));

    response.status(200).json({
      delivered: result.successCount,
      failed: result.failureCount,
      staleRegistrationsRemoved: staleRefs.length,
      fidTargets: devices.filter((item) => item.targetType === 'fid').length,
      tokenTargets: devices.filter((item) => item.targetType === 'token').length,
    });
  } catch (error) {
    const code = String(error?.code || '');
    if (code.startsWith('auth/')) {
      response.status(401).json({ error: 'Invalid or expired Firebase session.' });
      return;
    }

    console.error('Call notification failed:', error?.message || error);
    response.status(500).json({ error: 'Unable to send call notification.' });
  }
}
