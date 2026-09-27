import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
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
    // Notification+data FCM messages are normally displayed automatically.
    // This branch provides a fallback for data-only messages.
    if (payload.notification) return;

    const data = payload.data || {};
    if (data.type !== 'incoming_call') return;

    const title = data.callType === 'audio' ? 'Incoming audio call' : 'Incoming video call';
    const target = `/universe/chat?callId=${encodeURIComponent(data.callId || '')}`;

    await self.registration.showNotification(title, {
      body: 'Open Our Hidden Universe to answer.',
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
