import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const fallbackFirebaseConfig = {
  apiKey: 'AIzaSyCQMSKneV4KmH3qpyWN7-ag-c0s9_CdFD8',
  authDomain: 'secret-space0.firebaseapp.com',
  projectId: 'secret-space0',
  storageBucket: 'secret-space0.firebasestorage.app',
  messagingSenderId: '1005220151892',
  appId: '1:1005220151892:web:2753295f95cb56caed23c1',
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || fallbackFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || fallbackFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || fallbackFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || fallbackFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fallbackFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || fallbackFirebaseConfig.appId,
};

const messagingConfigured = Boolean(
  firebaseConfig.apiKey
  && firebaseConfig.projectId
  && firebaseConfig.messagingSenderId
  && firebaseConfig.appId
);

if (messagingConfigured) {
  const firebaseApp = initializeApp(firebaseConfig);
  const messaging = getMessaging(firebaseApp);

  onBackgroundMessage(messaging, async (payload) => {
    if (payload.notification) return;

    const data = payload.data || {};
    if (data.type !== 'incoming_call') return;

    const title = data.callType === 'audio' ? 'Incoming audio call' : 'Incoming video call';
    const callerName = data.callerName || 'Your partner';
    const target = `/universe/chat?callId=${encodeURIComponent(data.callId || '')}`;

    await self.registration.showNotification(title, {
      body: `${callerName} is calling you.`,
      tag: `ohu-call-${data.callId || 'incoming'}`,
      renotify: true,
      requireInteraction: true,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: {
        url: target,
      },
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  const target = event.notification?.data?.url;
  if (!target) return;

  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      const absolute = new URL(target, self.location.origin).href;

      for (const client of clients) {
        if ('focus' in client) {
          if ('navigate' in client) await client.navigate(absolute);
          return client.focus();
        }
      }

      return self.clients.openWindow?.(absolute);
    }),
  );
});
