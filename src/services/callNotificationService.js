import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  getMessaging,
  isSupported,
  onMessage,
  onRegistered,
  onUnregistered,
  register,
} from 'firebase/messaging';
import { app, auth, db, firebaseEnabled } from './firebase.js';

const deviceIdKey = 'ohu-call-device-id';

let nativeListenersReady = false;
let nativeRegistrationContext = null;
let nativeHandles = [];
let webRegistrationUnsubscribe = null;
let webUnregistrationUnsubscribe = null;
let webForegroundUnsubscribe = null;

function getDeviceId() {
  let value = localStorage.getItem(deviceIdKey);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(deviceIdKey, value);
  }
  return value;
}

function deviceRef(coupleId, uid) {
  return doc(
    db,
    'couples',
    coupleId,
    'members',
    uid,
    'devices',
    getDeviceId(),
  );
}

async function saveRegistration(coupleId, user, targetId, targetType, platform) {
  if (!firebaseEnabled || !coupleId || !user?.uid || !targetId) return;

  await setDoc(
    deviceRef(coupleId, user.uid),
    {
      targetId,
      targetType,
      platform,
      enabled: true,
      updatedAt: serverTimestamp(),
    },
    { merge: false },
  );
}

function emitCallOpen(data = {}) {
  window.dispatchEvent(
    new CustomEvent('ohu:call-notification-open', {
      detail: data,
    }),
  );
}

async function fetchNotificationServerHealth() {
  if (!auth?.currentUser) {
    return { serverReady: false, status: 'unavailable' };
  }

  try {
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch('/api/call-health', {
      method: 'GET',
      headers: { Authorization: `Bearer ${idToken}` },
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const body = await response.json().catch(() => ({}));
    return {
      serverReady: Boolean(response.ok && body.firebaseAdmin && body.pushServerConfigured !== false),
      status: response.ok ? 'ready' : 'server-unavailable',
      health: body,
    };
  } catch {
    return { serverReady: false, status: 'server-unavailable' };
  }
}

async function ensureNativeListeners() {
  if (nativeListenersReady) return;
  nativeListenersReady = true;

  nativeHandles.push(
    await PushNotifications.addListener('registration', async (registration) => {
      const context = nativeRegistrationContext;
      if (!context?.coupleId || !context?.user?.uid) return;

      await saveRegistration(
        context.coupleId,
        context.user,
        registration.value,
        'token',
        Capacitor.getPlatform(),
      ).catch(() => {});
    }),
  );

  nativeHandles.push(
    await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
      const data = event.notification?.data || {};
      if (data.type === 'incoming_call') emitCallOpen(data);
    }),
  );

  nativeHandles.push(
    await PushNotifications.addListener('registrationError', () => {}),
  );
}

async function registerNative(coupleId, user, requestPermission) {
  nativeRegistrationContext = { coupleId, user };
  await ensureNativeListeners();

  if (Capacitor.getPlatform() === 'android') {
    await PushNotifications.createChannel({
      id: 'calls',
      name: 'Incoming calls',
      description: 'Incoming audio and video calls from your private universe',
      importance: 5,
    }).catch(() => {});
  }

  let permission = await PushNotifications.checkPermissions();

  if (permission.receive === 'prompt' && requestPermission) {
    permission = await PushNotifications.requestPermissions();
  }

  if (permission.receive !== 'granted') {
    return {
      enabled: false,
      status: permission.receive === 'denied' ? 'blocked' : 'prompt',
      platform: Capacitor.getPlatform(),
      targetType: 'token',
    };
  }

  await PushNotifications.register();

  return {
    enabled: true,
    status: 'enabled',
    platform: Capacitor.getPlatform(),
    targetType: 'token',
  };
}

async function showForegroundCallNotification(serviceWorkerRegistration, payload) {
  const data = payload?.data || {};
  if (data.type !== 'incoming_call' || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;

  const callType = data.callType === 'audio' ? 'audio' : 'video';
  const callerName = data.callerName || 'Your partner';
  const title = callType === 'audio' ? 'Incoming audio call' : 'Incoming video call';
  const target = `/universe/chat?callId=${encodeURIComponent(data.callId || '')}`;

  await serviceWorkerRegistration.showNotification(payload?.notification?.title || title, {
    body: payload?.notification?.body || `${callerName} is calling you.`,
    tag: `ohu-call-${data.callId || 'incoming'}`,
    renotify: true,
    requireInteraction: true,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: target },
  });
}

async function registerWeb(coupleId, user, requestPermission) {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return { enabled: false, status: 'unsupported', platform: 'web', targetType: 'fid' };
  }

  if (!(await isSupported())) {
    return { enabled: false, status: 'unsupported', platform: 'web', targetType: 'fid' };
  }

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    return {
      enabled: false,
      status: 'misconfigured',
      platform: 'web',
      targetType: 'fid',
    };
  }

  let permission = Notification.permission;
  if (permission === 'default' && requestPermission) {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    return {
      enabled: false,
      status: permission === 'denied' ? 'blocked' : 'prompt',
      platform: 'web',
      targetType: 'fid',
    };
  }

  const serviceWorkerRegistration = await navigator.serviceWorker.ready;
  const messaging = getMessaging(app);

  webRegistrationUnsubscribe?.();
  webUnregistrationUnsubscribe?.();
  webForegroundUnsubscribe?.();

  webForegroundUnsubscribe = onMessage(messaging, (payload) => {
    showForegroundCallNotification(serviceWorkerRegistration, payload).catch(() => {});
  });

  const installationId = await new Promise((resolve, reject) => {
    let settled = false;

    const timeout = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('Firebase Messaging registration timed out.'));
      }
    }, 12000);

    webRegistrationUnsubscribe = onRegistered(messaging, (fid) => {
      saveRegistration(coupleId, user, fid, 'fid', 'web').catch(() => {});
      if (!settled) {
        settled = true;
        window.clearTimeout(timeout);
        resolve(fid);
      }
    });

    webUnregistrationUnsubscribe = onUnregistered(messaging, () => {
      deleteDoc(deviceRef(coupleId, user.uid)).catch(() => {});
    });

    register(messaging, {
      vapidKey,
      serviceWorkerRegistration,
    }).catch((error) => {
      if (!settled) {
        settled = true;
        window.clearTimeout(timeout);
        reject(error);
      }
    });
  });

  await saveRegistration(coupleId, user, installationId, 'fid', 'web');

  return {
    enabled: true,
    status: 'enabled',
    platform: 'web',
    targetType: 'fid',
  };
}

export async function getCallNotificationReadiness(coupleId, user) {
  if (!firebaseEnabled || !user?.uid || !coupleId) {
    return { status: 'unavailable', canEnable: false, serverReady: false };
  }

  const server = await fetchNotificationServerHealth();
  if (!server.serverReady) {
    return { status: 'server-unavailable', canEnable: false, serverReady: false };
  }

  if (Capacitor.isNativePlatform()) {
    const permission = await PushNotifications.checkPermissions();
    const status = permission.receive === 'granted'
      ? 'ready'
      : permission.receive === 'denied'
        ? 'blocked'
        : 'prompt';
    return {
      status,
      canEnable: status === 'ready' || status === 'prompt',
      serverReady: true,
      platform: Capacitor.getPlatform(),
      permission: permission.receive,
    };
  }

  if (!('Notification' in window) || !('serviceWorker' in navigator) || !(await isSupported())) {
    return { status: 'unsupported', canEnable: false, serverReady: true, platform: 'web' };
  }

  if (!import.meta.env.VITE_FIREBASE_VAPID_KEY) {
    return { status: 'misconfigured', canEnable: false, serverReady: true, platform: 'web' };
  }

  const permission = Notification.permission;
  const status = permission === 'granted' ? 'ready' : permission === 'denied' ? 'blocked' : 'prompt';
  return {
    status,
    canEnable: status === 'ready' || status === 'prompt',
    serverReady: true,
    platform: 'web',
    permission,
  };
}

export async function enableCallNotifications(coupleId, user) {
  if (!firebaseEnabled || !user?.uid || !coupleId) {
    return { enabled: false, status: 'unavailable', platform: 'unknown', targetType: 'unknown' };
  }

  const readiness = await getCallNotificationReadiness(coupleId, user);
  if (!readiness.canEnable) {
    return {
      enabled: false,
      status: readiness.status,
      platform: readiness.platform || 'unknown',
      targetType: Capacitor.isNativePlatform() ? 'token' : 'fid',
    };
  }

  return Capacitor.isNativePlatform()
    ? registerNative(coupleId, user, true)
    : registerWeb(coupleId, user, true);
}

export async function refreshCallNotificationRegistration(coupleId, user) {
  if (!firebaseEnabled || !user?.uid || !coupleId) {
    return { enabled: false, status: 'unavailable', platform: 'unknown', targetType: 'unknown' };
  }

  const readiness = await getCallNotificationReadiness(coupleId, user);
  if (!readiness.canEnable || readiness.status === 'prompt') {
    return {
      enabled: false,
      status: readiness.status,
      platform: readiness.platform || 'unknown',
      targetType: Capacitor.isNativePlatform() ? 'token' : 'fid',
    };
  }

  return Capacitor.isNativePlatform()
    ? registerNative(coupleId, user, false)
    : registerWeb(coupleId, user, false);
}

export async function removeCurrentCallNotificationRegistration(coupleId, user) {
  if (!firebaseEnabled || !coupleId || !user?.uid) return;
  await deleteDoc(deviceRef(coupleId, user.uid)).catch(() => {});
}

export async function sendIncomingCallPush(coupleId, callId) {
  if (!firebaseEnabled || !auth?.currentUser || !coupleId || !callId) {
    return { ok: false, delivered: 0, reason: 'unavailable' };
  }

  const idToken = await auth.currentUser.getIdToken();
  const response = await fetch('/api/call-notify', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify({ coupleId, callId }),
  });

  const body = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    delivered: Number(body.delivered || 0),
    failed: Number(body.failed || 0),
    reason: body.reason || (response.ok ? '' : 'delivery-failed'),
  };
}

export function disposeNativeCallNotificationListeners() {
  nativeHandles.forEach((handle) => handle?.remove?.());
  nativeHandles = [];
  nativeListenersReady = false;
  nativeRegistrationContext = null;

  webRegistrationUnsubscribe?.();
  webUnregistrationUnsubscribe?.();
  webForegroundUnsubscribe?.();
  webRegistrationUnsubscribe = null;
  webUnregistrationUnsubscribe = null;
  webForegroundUnsubscribe = null;
}
