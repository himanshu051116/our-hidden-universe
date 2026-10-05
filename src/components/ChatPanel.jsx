import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCheck,
  ChevronUp,
  CornerUpLeft,
  Heart,
  ImagePlus,
  Mic,
  MoreHorizontal,
  Plus,
  Send,
  Timer,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCall } from '../calls/CallContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  CHAT_LIMITS,
  addReaction,
  deleteChatMessage,
  loadOlderEncryptedMessages,
  markMessagesSeen,
  sendEncryptedMessage,
  sendMediaMessage,
  setTyping,
  subscribeToEncryptedMessages,
  subscribeToTypingState,
  uploadChatFile,
} from '../services/chatService';
import { firebaseEnabled } from '../services/firebase';
import { toDateValue } from '../utils/date';

const demoStorageKey = 'ohu-demo-messages-v1';
const emojis = ['❤️', '🥰', '😘', '🫶', '✨', '🌙'];
const replyPrefix = '↪ ';

function buildDemoMessages() {
  const base = Date.now();
  return [
    {
      id: 'welcome-1',
      senderId: 'partner',
      text: 'You made it into our little universe ✨',
      createdAt: new Date(base - 120000),
      seenBy: ['partner', 'demo-lover'],
      reactions: ['❤️'],
      type: 'text',
      clientNonce: 'welcome-1',
    },
    {
      id: 'welcome-2',
      senderId: 'demo-lover',
      text: 'This already feels like home.',
      createdAt: new Date(base - 60000),
      seenBy: ['demo-lover'],
      reactions: [],
      type: 'text',
      clientNonce: 'welcome-2',
    },
  ];
}

function readDemoMessages() {
  const saved = localStorage.getItem(demoStorageKey);
  if (!saved) {
    const initial = buildDemoMessages();
    localStorage.setItem(demoStorageKey, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(saved);
  } catch {
    return buildDemoMessages();
  }
}

function dataUrlFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Unable to read file.'));
    reader.readAsDataURL(file);
  });
}

async function prepareImageForUpload(file) {
  if (!file?.type?.startsWith('image/')) return file;
  if (file.type === 'image/gif' || file.size <= 700 * 1024) return file;

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Unable to prepare this image.'));
      element.src = sourceUrl;
    });

    const longest = Math.max(image.naturalWidth || 1, image.naturalHeight || 1);
    const scale = Math.min(1, 1440 / longest);
    const width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
    const height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error('Unable to prepare this image.'))),
        'image/jpeg',
        0.82,
      );
    });

    const baseName = String(file.name || 'image').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '-') || 'image';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function expiryFromOption(option) {
  if (option === '30s') return new Date(Date.now() + 30000).toISOString();
  if (option === '5m') return new Date(Date.now() + 5 * 60000).toISOString();
  if (option === '1h') return new Date(Date.now() + 60 * 60000).toISOString();
  return null;
}

function messageTimestamp(message) {
  const value = message.createdAt || message._clientCreatedAt || message.optimisticAt;
  return toDateValue(value).getTime();
}

function isExpired(message, now) {
  return Boolean(message.selfDestructAt) && new Date(message.selfDestructAt).getTime() <= now;
}

function readReceiptForMessage(message, userId) {
  if (message.pending || message._pendingWrite) return 'Sending…';
  const partnerSeen = (message.seenBy || []).some((id) => id !== userId);
  return partnerSeen ? 'Seen' : 'Delivered';
}

function splitReplyText(text = '') {
  const value = String(text || '');
  if (!value.startsWith(replyPrefix)) return { quote: '', body: value };
  const newline = value.indexOf('\n');
  if (newline < 0) return { quote: value.slice(replyPrefix.length), body: '' };
  return {
    quote: value.slice(replyPrefix.length, newline).trim(),
    body: value.slice(newline + 1),
  };
}

function replyQuoteForMessage(message) {
  if (!message) return 'Earlier message';
  if (message.type === 'image') return 'Photo';
  if (message.type === 'voice') return 'Voice note';
  const parsed = splitReplyText(message.text || message.caption || '');
  const source = String(parsed.body || parsed.quote || 'Message').replace(/\s+/g, ' ').trim();
  return source.length > 96 ? `${source.slice(0, 93)}…` : source || 'Message';
}

function mergeUniqueMessages(...groups) {
  const map = new Map();
  groups.flat().forEach((message) => {
    if (!message) return;
    const key = message.id || message.clientNonce;
    if (!key) return;
    map.set(key, message);
  });
  return [...map.values()].sort((a, b) => messageTimestamp(a) - messageTimestamp(b));
}

export default function ChatPanel({ onMessageCountChange }) {
  const { user, coupleId, sharedSecret } = useAuth();
  const { partner } = useCall();
  const [messages, setMessages] = useState(() => (firebaseEnabled ? [] : readDemoMessages()));
  const [historyMessages, setHistoryMessages] = useState([]);
  const [pendingMessages, setPendingMessages] = useState([]);
  const [typingMap, setTypingMap] = useState({});
  const [draft, setDraft] = useState('');
  const [selfDestruct, setSelfDestruct] = useState('keep');
  const [attachment, setAttachment] = useState(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [syncMeta, setSyncMeta] = useState({ fromCache: false, hasPendingWrites: false, receivedAt: 0 });
  const [online, setOnline] = useState(() => navigator.onLine);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [actionsFor, setActionsFor] = useState(null);

  const typingTimer = useRef(null);
  const lastTypingPulseRef = useRef(0);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const scrollRef = useRef(null);
  const nearBottomRef = useRef(true);
  const initialScrollRef = useRef(false);
  const previousCountRef = useRef(0);
  const seenTimerRef = useRef(null);
  const seenInFlightRef = useRef(new Set());
  const previewUrlsRef = useRef(new Map());
  const draftRef = useRef('');
  const historyLoadedRef = useRef(false);

  const partnerName = partner?.displayName || partner?.email || 'Your partner';
  const partnerInitial = String(partnerName).trim().charAt(0).toUpperCase() || 'P';

  function cleanupPreview(clientNonce) {
    const url = previewUrlsRef.current.get(clientNonce);
    if (url) URL.revokeObjectURL(url);
    previewUrlsRef.current.delete(clientNonce);
  }

  const confirmedMessages = useMemo(
    () => mergeUniqueMessages(historyMessages, messages),
    [historyMessages, messages],
  );

  const visibleMessages = useMemo(() => {
    const confirmedNonces = new Set(confirmedMessages.map((message) => message.clientNonce).filter(Boolean));
    return mergeUniqueMessages(
      confirmedMessages,
      pendingMessages.filter((message) => !confirmedNonces.has(message.clientNonce)),
    ).filter((message) => !isExpired(message, clock));
  }, [confirmedMessages, pendingMessages, clock]);

  useEffect(() => {
    setHistoryMessages([]);
    setHasOlder(false);
    historyLoadedRef.current = false;
    initialScrollRef.current = false;
    previousCountRef.current = 0;
  }, [coupleId]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!firebaseEnabled) return undefined;
    return subscribeToEncryptedMessages(
      coupleId,
      sharedSecret,
      (nextMessages, metadata) => {
        const confirmedNonces = new Set(nextMessages.map((message) => message.clientNonce).filter(Boolean));
        setMessages(nextMessages);
        setSyncMeta(metadata || { fromCache: false, hasPendingWrites: false, receivedAt: Date.now() });
        if (!historyLoadedRef.current) setHasOlder(Boolean(metadata?.hasOlder));
        setPendingMessages((current) => current.filter((pending) => {
          if (!confirmedNonces.has(pending.clientNonce)) return true;
          cleanupPreview(pending.clientNonce);
          return false;
        }));
        setNotice('');
      },
      () => setNotice('Couldn’t sync with your partner. Check your connection and try again.'),
    );
  }, [coupleId, sharedSecret]);

  useEffect(() => {
    if (!firebaseEnabled) return undefined;
    return subscribeToTypingState(coupleId, setTypingMap);
  }, [coupleId]);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    onMessageCountChange?.(visibleMessages.length);
  }, [visibleMessages.length, onMessageCountChange]);

  useEffect(() => {
    if (!firebaseEnabled || !user?.uid || document.visibilityState !== 'visible') return undefined;

    window.clearTimeout(seenTimerRef.current);
    const unseen = confirmedMessages.filter((message) =>
      message.senderId !== user.uid
      && !(message.seenBy || []).includes(user.uid)
      && !seenInFlightRef.current.has(message.id),
    );
    if (!unseen.length) return undefined;

    unseen.forEach((message) => seenInFlightRef.current.add(message.id));
    seenTimerRef.current = window.setTimeout(() => {
      markMessagesSeen(coupleId, unseen, user.uid)
        .catch(() => {})
        .finally(() => unseen.forEach((message) => seenInFlightRef.current.delete(message.id)));
    }, 120);

    return () => window.clearTimeout(seenTimerRef.current);
  }, [confirmedMessages, coupleId, user?.uid]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const latest = visibleMessages[visibleMessages.length - 1];
    const grew = visibleMessages.length > previousCountRef.current;
    previousCountRef.current = visibleMessages.length;

    if (!initialScrollRef.current) {
      initialScrollRef.current = true;
      requestAnimationFrame(() => container.scrollTo({ top: container.scrollHeight }));
      return;
    }

    if (!grew || loadingOlder) return;
    const shouldFollow = nearBottomRef.current || latest?.senderId === user?.uid || latest?.pending;
    if (shouldFollow) {
      setHasNewMessage(false);
      requestAnimationFrame(() => container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' }));
    } else if (latest?.senderId !== user?.uid) {
      setHasNewMessage(true);
    }
  }, [visibleMessages.length, user?.uid, loadingOlder]);

  useEffect(() => {
    if (!partner || !typingMap[partner.id] || !nearBottomRef.current) return;
    const container = scrollRef.current;
    requestAnimationFrame(() => container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' }));
  }, [typingMap, partner]);

  useEffect(
    () => () => {
      window.clearTimeout(typingTimer.current);
      if (firebaseEnabled && user?.uid) setTyping(coupleId, user.uid, false).catch(() => {});
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current.clear();
    },
    [coupleId, user?.uid],
  );

  const partnerTyping = partner ? Boolean(typingMap[partner.id]) : false;
  const pendingWork = pendingMessages.length > 0 || syncMeta.hasPendingWrites;
  const syncLabel = partnerTyping
    ? `${partnerName} is typing…`
    : !firebaseEnabled
      ? 'Private preview on this device'
      : !online
        ? 'Offline · messages will retry'
        : pendingWork
          ? 'Sending…'
          : syncMeta.fromCache
            ? 'Reconnecting…'
            : 'Synced';
  const syncTone = !online
    ? 'bg-red-300'
    : partnerTyping
      ? 'bg-blush'
      : pendingWork || syncMeta.fromCache
        ? 'bg-amber-300'
        : 'bg-emerald-300';

  function pulseTyping() {
    if (!firebaseEnabled || !user?.uid) return;
    const now = Date.now();
    if (now - lastTypingPulseRef.current > 850) {
      lastTypingPulseRef.current = now;
      setTyping(coupleId, user.uid, true).catch(() => {});
    }
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      lastTypingPulseRef.current = 0;
      setTyping(coupleId, user.uid, false).catch(() => {});
    }, 1050);
  }

  function stopTyping() {
    window.clearTimeout(typingTimer.current);
    lastTypingPulseRef.current = 0;
    if (firebaseEnabled && user?.uid) setTyping(coupleId, user.uid, false).catch(() => {});
  }

  function onDraftChange(value) {
    setDraft(value);
    draftRef.current = value;
    pulseTyping();
  }

  function persistLocal(nextMessages) {
    setMessages(nextMessages);
    localStorage.setItem(demoStorageKey, JSON.stringify(nextMessages));
  }

  async function loadEarlierMessages() {
    if (!firebaseEnabled || loadingOlder || !hasOlder) return;
    const oldest = confirmedMessages.find((message) => message.createdAt);
    if (!oldest?.createdAt) {
      setHasOlder(false);
      return;
    }

    const container = scrollRef.current;
    const previousHeight = container?.scrollHeight || 0;
    setLoadingOlder(true);
    setNotice('');
    try {
      const result = await loadOlderEncryptedMessages({
        coupleId,
        sharedSecret,
        beforeCreatedAt: oldest.createdAt,
      });
      historyLoadedRef.current = true;
      setHistoryMessages((current) => mergeUniqueMessages(result.messages, current));
      setHasOlder(result.hasMore);
      requestAnimationFrame(() => {
        if (!container) return;
        const nextHeight = container.scrollHeight;
        container.scrollTop += Math.max(0, nextHeight - previousHeight);
      });
    } catch {
      setNotice('Couldn’t load earlier messages. Try again when your connection is stable.');
    } finally {
      setLoadingOlder(false);
    }
  }

  async function sendLocalMessage({ text, file }) {
    let mediaUrl = '';
    let type = 'text';
    if (file) {
      mediaUrl = await dataUrlFromFile(file);
      type = file.type.startsWith('audio/') ? 'voice' : 'image';
    }

    const nextMessage = {
      id: crypto.randomUUID(),
      clientNonce: crypto.randomUUID(),
      senderId: user.uid,
      text: type === 'text' ? text : '',
      caption: type === 'text' ? '' : text,
      mediaUrl,
      type,
      createdAt: new Date().toISOString(),
      seenBy: [user.uid],
      reactions: [],
      selfDestructAt: type === 'text' ? expiryFromOption(selfDestruct) : null,
    };
    persistLocal([...messages, nextMessage]);
  }

  async function sendCurrentMessage() {
    const cleanDraft = draft.trim();
    const currentAttachment = attachment;
    const currentReply = replyingTo;
    if (!cleanDraft && !currentAttachment) return;

    const quote = currentReply && !currentAttachment ? replyQuoteForMessage(currentReply) : '';
    const outgoingText = quote ? `${replyPrefix}${quote}\n${cleanDraft}` : cleanDraft;
    if (outgoingText.length > CHAT_LIMITS.maxMessageLength) {
      setNotice(`Messages, including the reply preview, can be up to ${CHAT_LIMITS.maxMessageLength} characters.`);
      return;
    }

    setNotice('');
    stopTyping();
    setDraft('');
    draftRef.current = '';
    setAttachment(null);
    setReplyingTo(null);
    setToolsOpen(false);

    if (!firebaseEnabled) {
      try {
        await sendLocalMessage({ text: outgoingText, file: currentAttachment });
        setSelfDestruct('keep');
      } catch {
        setNotice('Unable to send that message.');
      }
      return;
    }

    const clientNonce = crypto.randomUUID();
    const optimisticAt = Date.now();

    if (!currentAttachment) {
      const optimistic = {
        id: `pending-${clientNonce}`,
        clientNonce,
        senderId: user.uid,
        text: outgoingText,
        type: 'text',
        optimisticAt,
        pending: true,
        seenBy: [user.uid],
        reactions: [],
        selfDestructAt: expiryFromOption(selfDestruct),
      };
      setPendingMessages((current) => [...current, optimistic]);
      setSelfDestruct('keep');

      sendEncryptedMessage({
        coupleId,
        sharedSecret,
        senderId: user.uid,
        text: outgoingText,
        selfDestructAt: optimistic.selfDestructAt,
        clientNonce,
      }).catch(() => {
        setPendingMessages((current) => current.filter((item) => item.clientNonce !== clientNonce));
        setDraft((current) => {
          if (current) return current;
          draftRef.current = cleanDraft;
          return cleanDraft;
        });
        if (currentReply) setReplyingTo(currentReply);
        setNotice('Message didn’t send. Your text was restored so you can retry.');
      });
      return;
    }

    const mediaType = currentAttachment.type.startsWith('audio/') ? 'voice' : 'image';
    const previewUrl = URL.createObjectURL(currentAttachment);
    previewUrlsRef.current.set(clientNonce, previewUrl);
    setPendingMessages((current) => [
      ...current,
      {
        id: `pending-${clientNonce}`,
        clientNonce,
        senderId: user.uid,
        caption: cleanDraft,
        mediaUrl: previewUrl,
        type: mediaType,
        optimisticAt,
        pending: true,
        uploadProgress: 0,
        seenBy: [user.uid],
        reactions: [],
      },
    ]);

    (async () => {
      try {
        const fileToUpload = mediaType === 'image'
          ? await prepareImageForUpload(currentAttachment)
          : currentAttachment;
        const mediaUrl = await uploadChatFile(coupleId, user.uid, fileToUpload, {
          clientNonce,
          onProgress: (uploadProgress) => {
            setPendingMessages((current) => current.map((item) =>
              item.clientNonce === clientNonce ? { ...item, uploadProgress } : item,
            ));
          },
        });
        await sendMediaMessage({
          coupleId,
          senderId: user.uid,
          mediaUrl,
          mediaType,
          caption: cleanDraft,
          clientNonce,
        });
      } catch {
        setPendingMessages((current) => current.filter((item) => item.clientNonce !== clientNonce));
        cleanupPreview(clientNonce);
        setAttachment((current) => current || currentAttachment);
        setNotice('Attachment didn’t send. It is ready for you to retry.');
      }
    })();
  }

  async function handleReaction(messageId) {
    if (String(messageId).startsWith('pending-')) return;
    if (!firebaseEnabled) {
      persistLocal(messages.map((message) =>
        message.id === messageId && !(message.reactions || []).includes('❤️')
          ? { ...message, reactions: [...(message.reactions || []), '❤️'] }
          : message,
      ));
      return;
    }
    await addReaction(coupleId, messageId, '❤️').catch(() => {});
  }

  async function handleDelete(message) {
    if (!message || message.senderId !== user.uid) return;
    setActionsFor(null);
    if (message.pending) {
      setPendingMessages((current) => current.filter((item) => item.clientNonce !== message.clientNonce));
      cleanupPreview(message.clientNonce);
      return;
    }

    const confirmed = window.confirm('Delete this message for both of you?');
    if (!confirmed) return;

    if (!firebaseEnabled) {
      persistLocal(messages.filter((item) => item.id !== message.id));
      return;
    }

    try {
      await deleteChatMessage(coupleId, message.id);
      setHistoryMessages((current) => current.filter((item) => item.id !== message.id));
    } catch {
      setNotice('That message could not be deleted. Try again.');
    }
  }

  function startReply(message) {
    if (!message || message.pending) return;
    setReplyingTo(message);
    setActionsFor(null);
    setAttachment(null);
    requestAnimationFrame(() => {
      document.querySelector('[data-chat-composer]')?.focus();
    });
  }

  function onScroll() {
    const container = scrollRef.current;
    if (!container) return;
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    nearBottomRef.current = distance < 110;
    if (nearBottomRef.current) setHasNewMessage(false);
  }

  function jumpToLatest() {
    const container = scrollRef.current;
    nearBottomRef.current = true;
    setHasNewMessage(false);
    container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }

  function addEmoji(emoji) {
    const next = `${draft}${emoji}`;
    setDraft(next);
    draftRef.current = next;
    pulseTyping();
  }

  async function toggleRecording() {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setNotice('Voice recording is not supported on this device.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => chunksRef.current.push(event.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
        setAttachment(file);
        setReplyingTo(null);
        recorder.stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
      };
      recorder.start();
      recorderRef.current = recorder;
      setToolsOpen(false);
      setNotice('Recording voice note… tap the microphone again to stop.');
    } catch {
      setNotice('Microphone access is needed to record a voice note.');
    }
  }

  function onComposerKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendCurrentMessage();
    }
  }

  return (
    <section className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-[linear-gradient(155deg,rgba(255,255,255,.05),rgba(255,255,255,.015))] shadow-[0_24px_70px_rgba(0,0,0,.28)]">
      <header className="flex items-center gap-3 border-b border-white/8 bg-black/22 px-3.5 py-3 sm:px-4">
        <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blush/10 font-display text-xl text-blush ring-1 ring-blush/15">
          {partnerInitial}
          <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#100b13] ${syncTone}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold text-white">{partner ? partnerName : 'Private chat'}</h2>
          <p className={`mt-0.5 truncate text-[11px] ${partnerTyping ? 'text-blush' : 'text-pink-100/52'}`}>{syncLabel}</p>
        </div>
        {!online ? (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-500/10 text-red-200" title="Offline">
            <WifiOff size={15} />
          </span>
        ) : null}
      </header>

      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="h-[58dvh] min-h-[390px] max-h-[680px] space-y-3 overflow-y-auto px-3 py-4 sm:px-4"
        >
          {firebaseEnabled && hasOlder ? (
            <div className="flex justify-center pb-1">
              <button
                type="button"
                onClick={loadEarlierMessages}
                disabled={loadingOlder}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 text-[10px] font-medium text-pink-100/65 transition hover:border-blush/20 hover:text-blush disabled:opacity-45"
              >
                <ChevronUp size={13} />
                {loadingOlder ? 'Loading…' : 'Earlier messages'}
              </button>
            </div>
          ) : null}

          {visibleMessages.map((message) => {
            const own = message.senderId === user.uid;
            const receipt = own ? readReceiptForMessage(message, user.uid) : '';
            const reply = message.type === 'text' ? splitReplyText(message.text) : { quote: '', body: message.caption || '' };
            const actionsOpen = actionsFor === message.id;
            return (
              <motion.article
                key={`${message.id}-${message.clientNonce || ''}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${own ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[84%] sm:max-w-[74%] ${own ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`rounded-[1.35rem] border px-3.5 py-2.5 shadow-[0_8px_22px_rgba(0,0,0,.12)] ${
                    own
                      ? 'rounded-br-md border-blush/16 bg-[linear-gradient(145deg,rgba(244,174,190,.18),rgba(212,160,122,.09))] text-white'
                      : 'rounded-bl-md border-white/8 bg-white/[0.055] text-pink-50'
                  }`}>
                    {reply.quote ? (
                      <div className="mb-2 rounded-xl border-l-2 border-blush/45 bg-black/16 px-2.5 py-1.5 text-[11px] leading-4 text-pink-100/62">
                        {reply.quote}
                      </div>
                    ) : null}
                    {message.type === 'image' && message.mediaUrl ? (
                      <img src={message.mediaUrl} alt="Shared" className="mb-2 max-h-72 w-full rounded-xl object-cover" />
                    ) : null}
                    {message.type === 'voice' && message.mediaUrl ? (
                      <audio controls preload="metadata" src={message.mediaUrl} className="mb-1 w-full max-w-[260px]" />
                    ) : null}
                    {message.type === 'text' ? (
                      <p className="whitespace-pre-wrap break-words text-[14px] leading-5">{reply.body}</p>
                    ) : message.caption ? (
                      <p className="break-words text-[13px] leading-5">{message.caption}</p>
                    ) : null}
                    {message.pending && message.type !== 'text' ? (
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-blush transition-all" style={{ width: `${Math.max(6, message.uploadProgress || 0)}%` }} />
                      </div>
                    ) : null}
                  </div>

                  <div className={`mt-1 flex items-center gap-1.5 px-1 text-[9px] text-pink-100/42 ${own ? 'justify-end' : 'justify-start'}`}>
                    <span>{toDateValue(message.createdAt || message._clientCreatedAt || message.optimisticAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {own ? (
                      <span className={`inline-flex items-center gap-0.5 ${receipt === 'Seen' ? 'text-blush' : ''}`}>
                        <CheckCheck size={11} />
                        {message.pending && message.type !== 'text' ? `${message.uploadProgress || 0}%` : receipt}
                      </span>
                    ) : null}
                    {!message.pending ? (
                      <button
                        type="button"
                        onClick={() => setActionsFor((current) => (current === message.id ? null : message.id))}
                        className="grid h-5 w-5 place-items-center rounded-full transition hover:bg-white/[0.06] hover:text-blush"
                        aria-label="Message actions"
                      >
                        <MoreHorizontal size={12} />
                      </button>
                    ) : null}
                    {(message.reactions || []).includes('❤️') ? <span className="text-[11px]">❤️</span> : null}
                  </div>

                  {actionsOpen ? (
                    <div className={`mt-1.5 flex items-center gap-1 rounded-xl border border-white/8 bg-black/28 p-1 ${own ? 'self-end' : 'self-start'}`}>
                      <button
                        type="button"
                        onClick={() => handleReaction(message.id)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[10px] text-pink-100/65 hover:bg-white/[0.05] hover:text-blush"
                      >
                        <Heart size={12} /> React
                      </button>
                      <button
                        type="button"
                        onClick={() => startReply(message)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[10px] text-pink-100/65 hover:bg-white/[0.05] hover:text-blush"
                      >
                        <CornerUpLeft size={12} /> Reply
                      </button>
                      {own ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(message)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[10px] text-red-200/70 hover:bg-red-500/10 hover:text-red-100"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </motion.article>
            );
          })}

          {partnerTyping ? (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-1 rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.05] px-3 py-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blush" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blush [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blush [animation-delay:240ms]" />
              </div>
            </div>
          ) : null}
        </div>

        {hasNewMessage ? (
          <button
            type="button"
            onClick={jumpToLatest}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-blush/20 bg-midnight/95 px-3.5 py-2 text-[11px] font-medium text-blush shadow-xl backdrop-blur-xl"
          >
            New message ↓
          </button>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {toolsOpen ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-white/8 bg-black/18"
          >
            <div className="flex flex-wrap items-center gap-2 px-3 py-3 sm:px-4">
              <label className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-[11px] text-pink-100/75">
                <ImagePlus size={13} />
                Photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    if (file) {
                      setAttachment(file);
                      setReplyingTo(null);
                    }
                    event.target.value = '';
                    setToolsOpen(false);
                  }}
                />
              </label>
              <button
                type="button"
                onClick={toggleRecording}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-[11px] text-pink-100/75"
              >
                <Mic size={13} />
                Voice
              </button>
              {emojis.map((emoji) => (
                <button key={emoji} type="button" onClick={() => addEmoji(emoji)} className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.04] text-base">
                  {emoji}
                </button>
              ))}
              <label className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 text-[10px] text-pink-100/60">
                <Timer size={12} />
                <select value={selfDestruct} onChange={(event) => setSelfDestruct(event.target.value)} className="bg-transparent text-pink-100 outline-none">
                  <option className="bg-midnight" value="keep">Keep</option>
                  <option className="bg-midnight" value="30s">30 sec</option>
                  <option className="bg-midnight" value="5m">5 min</option>
                  <option className="bg-midnight" value="1h">1 hour</option>
                </select>
              </label>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="border-t border-white/8 bg-black/22 px-2.5 pb-[calc(0.65rem+env(safe-area-inset-bottom))] pt-2.5 sm:px-4 sm:pb-3">
        {replyingTo ? (
          <div className="mb-2 flex items-start gap-2 rounded-xl border border-blush/12 bg-blush/[0.055] px-3 py-2">
            <CornerUpLeft size={13} className="mt-0.5 shrink-0 text-blush" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold text-blush">Replying</p>
              <p className="truncate text-[11px] text-pink-100/58">{replyQuoteForMessage(replyingTo)}</p>
            </div>
            <button type="button" onClick={() => setReplyingTo(null)} className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-white/[0.05]" aria-label="Cancel reply">
              <X size={13} />
            </button>
          </div>
        ) : null}

        {attachment ? (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] text-pink-100/65">
            <span className="truncate">{attachment.type.startsWith('audio/') ? '🎙 Voice note' : '🖼 Photo'} · {attachment.name}</span>
            <button type="button" onClick={() => setAttachment(null)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/[0.06]" aria-label="Remove attachment">
              <X size={13} />
            </button>
          </div>
        ) : null}

        {notice ? (
          <div className="mb-2 flex items-start gap-2 rounded-xl bg-amber-300/8 px-3 py-2 text-[11px] leading-4 text-amber-100/80">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>{notice}</span>
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => setToolsOpen((value) => !value)}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border transition active:scale-95 ${toolsOpen ? 'border-blush/25 bg-blush/10 text-blush' : 'border-white/10 bg-white/[0.04] text-pink-100/70'}`}
            aria-label="Message tools"
          >
            <Plus size={19} className={toolsOpen ? 'rotate-45 transition' : 'transition'} />
          </button>

          <div className="min-w-0 flex-1 rounded-[1.25rem] border border-white/10 bg-white/[0.045] px-3 py-2 focus-within:border-blush/25">
            <textarea
              data-chat-composer
              rows={1}
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={onComposerKeyDown}
              placeholder={replyingTo ? 'Write a reply…' : 'Message…'}
              maxLength={CHAT_LIMITS.maxMessageLength}
              className="max-h-28 min-h-[27px] w-full resize-none bg-transparent text-[14px] leading-5 text-white outline-none placeholder:text-pink-100/32"
            />
            {draft.length > 1600 ? <p className="mt-1 text-right text-[9px] text-pink-100/35">{draft.length}/{CHAT_LIMITS.maxMessageLength}</p> : null}
          </div>

          <button
            type="button"
            onClick={sendCurrentMessage}
            disabled={!draft.trim() && !attachment}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-r from-blush to-roseGold text-midnight shadow-[0_8px_24px_rgba(244,174,190,.13)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Send message"
          >
            <Send size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}
