import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCheck, ImagePlus, Mic, Send, ShieldCheck, TimerReset } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  addReaction,
  CHAT_LIMITS,
  markSeen,
  sendEncryptedMessage,
  sendMediaMessage,
  setTyping,
  subscribeToEncryptedMessages,
  subscribeToTypingState,
  uploadChatFile,
} from '../services/chatService.js';
import { firebaseEnabled } from '../services/firebase.js';
import { formatTime, toDateValue } from '../utils/date.js';
import SectionTitle from './SectionTitle.jsx';

const demoKey = 'ohu-demo-messages-v1';
const legacyDemoIds = new Set(['d1', 'd2']);
const emojis = ['\u2764\uFE0F', '\u2728', '\uD83C\uDF19', '\uD83D\uDC8C', '\uD83E\uDD7A'];
const maxUploadMb = Math.floor(CHAT_LIMITS.maxUploadBytes / (1024 * 1024));

function loadDemoMessages() {
  try {
    const raw = localStorage.getItem(demoKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((entry) => !legacyDemoIds.has(entry.id)) : [];
  } catch {
    return [];
  }
}

function dataUrlFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result?.toString() || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function compressedImageDataUrlFromFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxSide = 1280;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to prepare this image.'));
    };

    image.src = objectUrl;
  });
}

function attachmentValidationError(file) {
  if (!file) return '';
  if (!file.type.startsWith('image/') && !file.type.startsWith('audio/')) {
    return 'Only image and audio files are allowed.';
  }
  if (file.size > CHAT_LIMITS.maxUploadBytes) {
    return `File too large. Max ${maxUploadMb}MB allowed.`;
  }
  return '';
}

function readReceiptForMessage(message, currentUserId) {
  const seenBy = message.seenBy || [];
  const seenAtBy = message.seenAtBy || {};
  const partnerSeenEntry = Object.entries(seenAtBy).find(([uid]) => uid !== currentUserId);

  if (partnerSeenEntry && partnerSeenEntry[1]) {
    return `Seen ${formatTime(partnerSeenEntry[1])}`;
  }
  if (seenBy.some((uid) => uid !== currentUserId)) {
    return 'Seen';
  }
  return 'Delivered';
}

export default function ChatPanel({ onMessageCountChange }) {
  const { user, coupleId, sharedSecret } = useAuth();
  const [messages, setMessages] = useState(() => loadDemoMessages());
  const [typingMap, setTypingMap] = useState({});
  const [draft, setDraft] = useState('');
  const [selfDestruct, setSelfDestruct] = useState('none');
  const [attachment, setAttachment] = useState(null);
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);
  const typingTimerRef = useRef(null);
  const typingStateRef = useRef(false);
  const noticeTimerRef = useRef(null);
  const endRef = useRef(null);

  const visibleMessages = useMemo(
    () => messages.filter((message) => !message.selfDestructAt || new Date(message.selfDestructAt).getTime() > Date.now()),
    [messages],
  );

  const partnerTyping = Object.entries(typingMap).some(([uid, isTyping]) => uid !== user?.uid && isTyping);

  useEffect(() => {
    if (!firebaseEnabled || !coupleId) return undefined;

    const unsubscribeMessages = subscribeToEncryptedMessages(
      coupleId,
      sharedSecret,
      (nextMessages) => {
        setMessages(nextMessages);
      },
      () => {
        showNotice('Chat sync is blocked. Check that both partners joined the same couple code and Firestore rules are deployed.');
      },
    );
    const unsubscribeTyping = subscribeToTypingState(coupleId, setTypingMap);

    return () => {
      unsubscribeMessages?.();
      unsubscribeTyping?.();
    };
  }, [coupleId, sharedSecret]);

  useEffect(() => {
    if (firebaseEnabled) return;
    localStorage.setItem(demoKey, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [visibleMessages.length, partnerTyping]);

  useEffect(() => {
    onMessageCountChange?.(visibleMessages.length);
  }, [onMessageCountChange, visibleMessages.length]);

  useEffect(() => {
    if (!firebaseEnabled || !coupleId || !user?.uid) return;
    visibleMessages.forEach((message) => {
      if (message.senderId !== user.uid) {
        markSeen(coupleId, message.id, user.uid, message.seenBy || [], message.seenAtBy || {});
      }
    });
  }, [visibleMessages, user?.uid, coupleId]);

  useEffect(
    () => () => {
      clearTimeout(noticeTimerRef.current);
    },
    [],
  );

  useEffect(
    () => () => {
      clearTimeout(typingTimerRef.current);
      if (firebaseEnabled && coupleId && user?.uid && typingStateRef.current) {
        setTyping(coupleId, user.uid, false);
      }
    },
    [coupleId, user?.uid],
  );

  function showNotice(text) {
    setNotice(text);
    clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(''), 3600);
  }

  async function handleSend() {
    if (sending) return;
    const cleanDraft = draft.trim();
    if (!cleanDraft && !attachment) return;
    if (cleanDraft.length > CHAT_LIMITS.maxMessageLength) {
      showNotice(`Message too long. Max ${CHAT_LIMITS.maxMessageLength} characters.`);
      return;
    }

    const attachmentError = attachmentValidationError(attachment);
    if (attachmentError) {
      showNotice(attachmentError);
      return;
    }

    setSending(true);
    const selfDestructAt =
      selfDestruct === 'none'
        ? null
        : new Date(Date.now() + Number(selfDestruct) * 1000).toISOString();

    try {
      if (firebaseEnabled) {
        if (cleanDraft && !attachment) {
          await sendEncryptedMessage({
            coupleId,
            sharedSecret,
            senderId: user.uid,
            text: cleanDraft,
            selfDestructAt,
          });
        }
        if (attachment) {
          const mediaUrl = attachment.type.startsWith('image/')
            ? await compressedImageDataUrlFromFile(attachment)
            : await uploadChatFile(coupleId, user.uid, attachment);
          if (mediaUrl) {
            const mediaType = attachment.type.startsWith('audio') ? 'voice' : 'image';
            await sendMediaMessage({
              coupleId,
              senderId: user.uid,
              mediaUrl,
              mediaType,
              caption: cleanDraft,
            });
          }
        }
      } else {
        const localMessages = [];
        if (cleanDraft) {
          localMessages.push({
            id: crypto.randomUUID(),
            text: cleanDraft,
            senderId: user.uid,
            createdAt: new Date().toISOString(),
            seenBy: [user.uid],
            seenAtBy: { [user.uid]: new Date().toISOString() },
            reactions: [],
            type: 'text',
            selfDestructAt,
          });
        }

        if (attachment) {
          const mediaUrl = await dataUrlFromFile(attachment);
          localMessages.push({
            id: crypto.randomUUID(),
            senderId: user.uid,
            createdAt: new Date().toISOString(),
            seenBy: [user.uid],
            seenAtBy: { [user.uid]: new Date().toISOString() },
            reactions: [],
            type: attachment.type.startsWith('audio') ? 'voice' : 'image',
            mediaUrl,
            caption: cleanDraft,
          });
        }

        setMessages((previous) => [...previous, ...localMessages]);
      }

      setDraft('');
      setSelfDestruct('none');
      setAttachment(null);
      if (firebaseEnabled && typingStateRef.current) {
        typingStateRef.current = false;
        setTyping(coupleId, user.uid, false);
      }
    } catch (error) {
      showNotice(error.message || 'Unable to send message right now.');
    } finally {
      setSending(false);
    }
  }

  function onDraftChange(value) {
    setDraft(value);
    if (!firebaseEnabled || !coupleId || !user?.uid) return;
    if (!typingStateRef.current) {
      typingStateRef.current = true;
      setTyping(coupleId, user.uid, true);
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      typingStateRef.current = false;
      setTyping(coupleId, user.uid, false);
    }, 1200);
  }

  function onSelectAttachment(file) {
    const error = attachmentValidationError(file);
    if (error) {
      setAttachment(null);
      showNotice(error);
      return;
    }
    setAttachment(file);
  }

  async function onReact(messageId) {
    if (firebaseEnabled) {
      await addReaction(coupleId, messageId, 'Miss You \u2764\uFE0F');
      return;
    }
    setMessages((previous) =>
      previous.map((message) =>
        message.id === messageId
          ? { ...message, reactions: [...(message.reactions || []), 'Miss You \u2764\uFE0F'] }
          : message,
      ),
    );
  }

  return (
    <section id="chat" className="glass rounded-3xl p-4 sm:p-6">
      <SectionTitle
        overline="Private Chat"
        title="End-to-end encrypted love notes"
        subtitle="Text is encrypted on the client before storage. Attachments use authenticated protected storage."
      />

      {!firebaseEnabled ? (
        <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-roseGold/35 bg-roseGold/12 px-3 py-2 text-xs text-roseGold">
          <AlertTriangle size={13} />
          Local demo mode is active. Messages stay in this browser until Firebase env vars are loaded and the app is restarted.
        </div>
      ) : null}

      <div className="mb-3 grid gap-2 rounded-2xl bg-black/30 p-3 text-xs text-pink-100/80 sm:grid-cols-3">
        <p className="inline-flex items-center gap-2">
          <ShieldCheck size={14} className="text-roseGold" />
          Encrypted text + integrity check
        </p>
        <p className="inline-flex items-center gap-2">
          <CheckCheck size={14} className="text-roseGold" />
          Seen receipts with read time
        </p>
        <p className="inline-flex items-center gap-2">
          <TimerReset size={14} className="text-roseGold" />
          Secure uploads (image/audio, max {maxUploadMb}MB)
        </p>
      </div>

      {notice ? (
        <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-roseGold/35 bg-roseGold/12 px-3 py-2 text-xs text-roseGold">
          <AlertTriangle size={13} />
          {notice}
        </div>
      ) : null}

      <div className="h-[320px] overflow-y-auto rounded-2xl bg-black/35 p-3 sm:h-[420px] sm:p-4">
        <div className="space-y-3">
          {!visibleMessages.length ? (
            <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-6 text-center text-sm text-pink-100/75">
              No messages yet. Your private chat history starts with the first message you send.
            </div>
          ) : null}
          {visibleMessages.map((message) => {
            const own = message.senderId === user?.uid;
            const createdAt = toDateValue(message.createdAt);
            return (
              <div key={message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm sm:max-w-[72%] ${own ? 'bg-wine/75 text-pink-50' : 'bg-plum/75 text-pink-100'}`}>
                  {message.type === 'image' && message.mediaUrl ? (
                    <img src={message.mediaUrl} alt="shared memory" className="mb-2 max-h-56 w-full rounded-xl object-cover" />
                  ) : null}

                  {message.type === 'voice' && message.mediaUrl ? (
                    <audio controls className="mb-2 w-full">
                      <source src={message.mediaUrl} />
                    </audio>
                  ) : null}

                  {message.text ? <p>{message.text}</p> : null}
                  {message.caption ? <p className="mt-1 text-xs text-pink-100/80">{message.caption}</p> : null}

                  {message.reactions?.length ? <p className="mt-1 text-xs text-blush/90">{message.reactions.join(' ')}</p> : null}

                  {message.selfDestructAt ? (
                    <p className="mt-1 text-[11px] text-roseGold/90">
                      Disappears at {formatTime(message.selfDestructAt)}
                    </p>
                  ) : null}

                  <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-pink-100/70">
                    <span>{createdAt.toLocaleDateString([], { month: 'short', day: 'numeric' })} {formatTime(createdAt)}</span>
                    {own ? <span>{readReceiptForMessage(message, user?.uid)}</span> : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => onReact(message.id)}
                    className="mt-2 rounded-full border border-white/10 px-3 py-1 text-[11px] text-blush transition hover:border-blush/70"
                  >
                    Miss You {'\u2764\uFE0F'}
                  </button>
                </div>
              </div>
            );
          })}

          <AnimatePresence>
            {partnerTyping && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="text-xs text-roseGold"
              >
                Your partner is typing...
              </motion.p>
            )}
          </AnimatePresence>
          <div ref={endRef} />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="rounded-full bg-white/10 px-3 py-1 text-sm transition hover:bg-white/20"
              onClick={() => onDraftChange(draft + emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>

        <textarea
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault();
              handleSend();
            }
          }}
          rows={3}
          placeholder="Write what your heart is saying..."
          className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-blush/70"
        />
        <div className="flex items-center justify-between text-[11px] text-pink-100/70">
          <span>Press Ctrl/Cmd + Enter to send</span>
          <span>{draft.trim().length}/{CHAT_LIMITS.maxMessageLength}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-full bg-white/10 px-4 py-2 text-xs text-pink-100 transition hover:bg-white/20">
            <span className="inline-flex items-center gap-2">
              <ImagePlus size={14} />
              Image
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={(event) => onSelectAttachment(event.target.files?.[0] || null)} />
          </label>

          <label className="cursor-pointer rounded-full bg-white/10 px-4 py-2 text-xs text-pink-100 transition hover:bg-white/20">
            <span className="inline-flex items-center gap-2">
              <Mic size={14} />
              Voice
            </span>
            <input type="file" accept="audio/*" className="hidden" onChange={(event) => onSelectAttachment(event.target.files?.[0] || null)} />
          </label>

          <select
            value={selfDestruct}
            onChange={(event) => setSelfDestruct(event.target.value)}
            className="rounded-full border border-white/10 bg-black/35 px-3 py-2 text-xs text-pink-100 outline-none"
          >
            <option value="none">No self-destruct</option>
            <option value="30">Self-destruct in 30s</option>
            <option value="300">Self-destruct in 5m</option>
            <option value="3600">Self-destruct in 1h</option>
          </select>

          {attachment ? <p className="text-xs text-blush/90">{attachment.name}</p> : null}

          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blush to-roseGold px-4 py-2 text-xs font-semibold text-midnight transition hover:brightness-105 disabled:opacity-60"
          >
            <Send size={14} />
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </section>
  );
}
