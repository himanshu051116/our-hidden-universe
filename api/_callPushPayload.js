// Pure payload builder: web data messages are rendered by OHS service worker,
// while native Android pushes use platform notifications.
export function createCallPushMessage(device, call, callerName, siteOrigin) {
  const type = call.type === 'audio' ? 'audio' : 'video';
  const title = type === 'audio' ? 'Incoming audio call' : 'Incoming video call';
  const text = `${callerName || 'Your partner'} is calling you.`;
  const target = device.targetType === 'fid'
    ? { fid: device.targetId }
    : { token: device.targetId };
  const data = {
    type: 'incoming_call',
    coupleId: call.coupleId,
    callId: call.id,
    callType: type,
    callerName: callerName || 'Your partner',
  };
  const tag = `ohu-call-${call.id}`;
  const message = { ...target, data };
  if (device.platform === 'web') {
    message.webpush = {
      headers: { TTL: '30', Urgency: 'high' },
      // No notification payload: the SW onBackgroundMessage shows exactly one
      // notification containing a safe deep-link, also used by notificationclick.
      fcmOptions: { link: new URL(`/universe/chat?callId=${encodeURIComponent(call.id)}`, siteOrigin).toString() },
    };
  } else {
    message.notification = { title, body: text };
    message.android = {
      priority: 'high', ttl: 30000,
      notification: { channelId: 'calls', tag, sound: 'default' },
    };
  }
  return message;
}

export function safeNotificationOrigin(value) {
  try {
    const url = new URL(value || 'https://ohs.vercel.app');
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw Error('invalid');
    return url.origin;
  } catch {
    return 'https://ohs.vercel.app';
  }
}
