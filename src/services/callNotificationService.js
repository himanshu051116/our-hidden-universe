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

// Permission for on-device notifications is independent of FCM/server readiness.
// Foreground Firestore ringing still works when background push cannot be configured.
export async function getCallNotificationReadiness(coupleId, user) {
  if (!firebaseEnabled || !user?.uid || !coupleId) {
    return { enabled: false, status: 'unavailable', canEnable: false, serverReady: false, foregroundEnabled: false };
  }

  const native = Capacitor.isNativePlatform();
  let permission = 'unsupported';
  let supported = false;
  if (native) {
    const result = await PushNotifications.checkPermissions();
    permission = result.receive;
    supported = true;
  } else {
    supported = typeof window !== 'undefined' && 'Notification' in window;
    permission = supported ? Notification.permission : 'unsupported';
  }

  const foregroundEnabled = supported && permission === 'granted';
  const server = await fetchNotificationServerHealth();
  const vapidReady = native || Boolean(import.meta.env.VITE_FIREBASE_VAPID_KEY);
  const messagingSupported = native || (
    supported && 'serviceWorker' in navigator && await isSupported().catch(() => false)
  );
  const backgroundReady = server.serverReady && vapidReady && messagingSupported;

  const status = !supported ? 'unsupported'
    : permission === 'denied' ? 'blocked'
      : !backgroundReady ? (foregroundEnabled ? 'foreground-only' : 'background-unavailable')
        : permission === 'granted' ? 'ready' : 'prompt';

  return {
    enabled: false,
    status,
    canEnable: backgroundReady && permission !== 'denied',
    serverReady: server.serverReady,
    foregroundEnabled,
    backgroundReady,
    platform: native ? Capacitor.getPlatform() : 'web',
    permission,
  };
}

export async function requestOnDeviceCallAlerts() {
  if (Capacitor.isNativePlatform()) {
    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === 'prompt') permission = await PushNotifications.requestPermissions();
    return {
      foregroundEnabled: permission.receive === 'granted',
      status: permission.receive === 'granted' ? 'foreground-only' : 'blocked',
    };
  }
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { foregroundEnabled: false, status: 'unsupported' };
  }
  let permission = Notification.permission;
  if (permission === 'default') permission = await Notification.requestPermission();
  return {
    foregroundEnabled: permission === 'granted',
    status: permission === 'granted' ? 'foreground-only' : permission === 'denied' ? 'blocked' : 'prompt',
  };
}

const alertedCalls = new Set();
export async function showIncomingCallAlert(call, callerName = 'Your partner') {
  if (!call?.id || typeof window === 'undefined' || document.visibilityState === 'visible') return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (alertedCalls.has(call.id)) return;
  alertedCalls.add(call.id);
  if (alertedCalls.size > 30) alertedCalls.delete(alertedCalls.values().next().value);

  const title = call.type === 'audio' ? 'Incoming audio call' : 'Incoming video call';
  const options = {
    body: `${callerName} is calling you.`,
    tag: `ohu-call-${call.id}`,
    icon: '/icon-192.png',
    data: { url: `/universe/chat?callId=${encodeURIComponent(call.id)}` },
  };
  try {
    const registration = await navigator.serviceWorker?.getRegistration?.();
    if (registration?.showNotification) {
      await registration.showNotification(title, { ...options, requireInteraction: true, renotify: true });
    } else {
      const notification = new Notification(title, options);
      notification.onclick = () => {
        window.focus();
        emitCallOpen({ type: 'incoming_call', coupleId: call.coupleId, callId: call.id });
        notification.close();
      };
    }
  } catch {
    alertedCalls.delete(call.id);
  }
}

export async function enableCallNotifications(coupleId, user) {
  if (!firebaseEnabled || !user?.uid || !coupleId) {
    return { enabled: false, status: 'unavailable', foregroundEnabled: false };
  }
  const readiness = await getCallNotificationReadiness(coupleId, user);
  if (!readiness.backgroundReady) {
    const local = await requestOnDeviceCallAlerts();
    return { ...readiness, ...local, enabled: false };
  }
  if (!readiness.canEnable) return { ...readiness, enabled: false };
  const result = Capacitor.isNativePlatform()
    ? await registerNative(coupleId, user, true)
    : await registerWeb(coupleId, user, true);
  return { ...readiness, ...result, foregroundEnabled: result.enabled || readiness.foregroundEnabled };
}

export async function refreshCallNotificationRegistration(coupleId, user) {
  const readiness = await getCallNotificationReadiness(coupleId, user);
  if (!readiness.backgroundReady || !readiness.canEnable || readiness.permission !== 'granted') {
    return readiness;
  }
  try {
    const result = Capacitor.isNativePlatform()
      ? await registerNative(coupleId, user, false)
      : await registerWeb(coupleId, user, false);
    return { ...readiness, ...result, foregroundEnabled: result.enabled || readiness.foregroundEnabled };
  } catch {
    return { ...readiness, enabled: false, status: 'registration-failed' };
  }
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
