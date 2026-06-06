import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCheck, ImagePlus, Mic, Send } from 'lucide-react';
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
  const [pendingMessages, setPendingMessages] = useState([]);
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

  const visibleMessages = useMemo(() => {
    const confirmedNonces = new Set(messages.map((message) => message.clientNonce).filter(Boolean));
    return [...messages, ...pendingMessages.filter((message) => !confirmedNonces.has(message.clientNonce))]
      .filter((message) => !message.selfDestructAt || new Date(message.selfDestructAt).getTime() > Date.now())
      .sort((a, b) => toDateValue(a.createdAt).getTime() - toDateValue(b.createdAt).getTime());
  }, [messages, pendingMessages]);

  const partnerTyping = Object.entries(typingMap).some(([uid, isTyping]) => uid !== user?.uid && isTyping);

  useEffect(() => {
    if (!firebaseEnabled || !coupleId) return undefined;

    const unsubscribeMessages = subscribeToEncryptedMessages(
      coupleId,
      sharedSecret,
      (nextMessages) => {
        setMessages(nextMessages);
        setPendingMessages((previous) =>
          previous.filter((pending) => !nextMessages.some((message) => message.clientNonce === pending.clientNonce)),
        );
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
    const clientNonce = crypto.randomUUID();

    try {
      if (firebaseEnabled) {
        if (cleanDraft && !attachment) {
          setPendingMessages((previous) => [
            ...previous,
            {
              id: `pending-${clientNonce}`,
              clientNonce,
              text: cleanDraft,
              senderId: user.uid,
              createdAt: new Date().toISOString(),
              seenBy: [user.uid],
              seenAtBy: { [user.uid]: new Date().toISOString() },
              reactions: [],
              type: 'text',
              selfDestructAt,
              pending: true,
            },
          ]);
          setDraft('');
          setSelfDestruct('none');
          await sendEncryptedMessage({
            coupleId,
            sharedSecret,
            senderId: user.uid,
            text: cleanDraft,
            selfDestructAt,
            clientNonce,
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

      if (!firebaseEnabled || attachment) setDraft('');
      setSelfDestruct('none');
      setAttachment(null);
      if (firebaseEnabled && typingStateRef.current) {
        typingStateRef.current = false;
        setTyping(coupleId, user.uid, false);
      }
    } catch (error) {
      setPendingMessages((previous) => previous.filter((message) => message.clientNonce !== clientNonce));
      if (firebaseEnabled && cleanDraft && !attachment) setDraft(cleanDraft);
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
    <section id="chat" className="glass overflow-hidden rounded-2xl sm:rounded-3xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/30 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blush to-roseGold font-display text-xl text-midnight">
            U
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-white">Our Hidden Universe</h2>
            <p className="truncate text-xs text-pink-100/65">{partnerTyping ? 'Partner is typing...' : firebaseEnabled ? 'Private synced chat' : 'Local demo chat'}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-pink-100/75">
          <CheckCheck size={13} />
          Live
        </span>
      </div>

      {(notice || !firebaseEnabled) ? (
        <div className="mx-4 mt-3 inline-flex items-center gap-2 rounded-xl border border-roseGold/35 bg-roseGold/12 px-3 py-2 text-xs text-roseGold sm:mx-5">
          <AlertTriangle size={13} />
          {notice || 'Local demo mode is active. Use Firebase env vars for two-phone syncing.'}
        </div>
      ) : null}

      <div className="h-[calc(100vh-18rem)] min-h-[420px] overflow-y-auto bg-[#090611] p-3 sm:h-[560px] sm:p-5">
        <div className="space-y-2">
          {!visibleMessages.length ? (
            <div className="mx-auto mt-16 max-w-xs rounded-2xl border border-white/10 bg-black/35 px-4 py-5 text-center text-sm text-pink-100/70">
              Start with a small message. It will appear here instantly.
            </div>
          ) : null}

          {visibleMessages.map((message) => {
            const own = message.senderId === user?.uid;
            const createdAt = toDateValue(message.createdAt);
            return (
              <div key={message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm shadow-lg sm:max-w-[70%] ${own ? 'rounded-br-md bg-[#245c4f] text-white' : 'rounded-bl-md bg-[#1c1726] text-pink-100'}`}>
                  {message.type === 'image' && message.mediaUrl ? (
                    <img src={message.mediaUrl} alt="shared memory" className="mb-2 max-h-56 w-full rounded-xl object-cover" />
                  ) : null}

                  {message.type === 'voice' && message.mediaUrl ? (
                    <audio controls className="mb-2 w-full">
                      <source src={message.mediaUrl} />
                    </audio>
                  ) : null}

                  {message.text ? <p className="whitespace-pre-wrap break-words leading-5">{message.text}</p> : null}
                  {message.caption ? <p className="mt-1 whitespace-pre-wrap break-words text-xs text-pink-100/80">{message.caption}</p> : null}
                  {message.reactions?.length ? <p className="mt-1 text-xs text-blush/90">{message.reactions.join(' ')}</p> : null}

                  {message.selfDestructAt ? (
                    <p className="mt-1 text-[11px] text-roseGold/90">Disappears at {formatTime(message.selfDestructAt)}</p>
                  ) : null}

                  <div className="mt-1 flex items-center justify-end gap-2 text-[10px] text-pink-100/60">
                    <span>{formatTime(createdAt)}</span>
                    {own ? (
                      <span className="inline-flex items-center gap-1 text-pink-100/75">
                        <CheckCheck size={12} />
                        {message.pending ? 'Sending' : readReceiptForMessage(message, user?.uid)}
                      </span>
                    ) : null}
                  </div>

                  {!message.pending ? (
                    <button
                      type="button"
                      onClick={() => onReact(message.id)}
                      className="mt-1 rounded-full px-2 py-1 text-[11px] text-blush transition hover:bg-white/10"
                    >
                      Miss You {'\u2764\uFE0F'}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}

          <AnimatePresence>
            {partnerTyping && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="inline-flex w-fit items-center gap-2 rounded-2xl rounded-bl-md bg-[#1c1726] px-3 py-2 text-xs text-blush"
              >
                <span>typing</span>
                <span className="flex gap-1">
                  {[0, 1, 2].map((dot) => (
                    <motion.span
                      key={dot}
                      className="h-1.5 w-1.5 rounded-full bg-blush"
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.14 }}
                    />
                  ))}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-white/10 bg-black/35 p-3 sm:p-4">
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-sm transition hover:bg-white/20"
              onClick={() => onDraftChange(draft + emoji)}
            >
              {emoji}
            </button>
          ))}
          <select
            value={selfDestruct}
            onChange={(event) => setSelfDestruct(event.target.value)}
            className="ml-auto h-9 shrink-0 rounded-full border border-white/10 bg-black/35 px-3 text-xs text-pink-100 outline-none"
          >
            <option value="none">Keep</option>
            <option value="30">30s</option>
            <option value="300">5m</option>
            <option value="3600">1h</option>
          </select>
        </div>

        {attachment ? <p className="mb-2 truncate text-xs text-blush/90">{attachment.name}</p> : null}

        <div className="flex items-end gap-2">
          <label className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full bg-white/10 text-pink-100 transition hover:bg-white/20" aria-label="Attach image">
            <ImagePlus size={18} />
            <input type="file" accept="image/*" className="hidden" onChange={(event) => onSelectAttachment(event.target.files?.[0] || null)} />
          </label>

          <label className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full bg-white/10 text-pink-100 transition hover:bg-white/20" aria-label="Attach voice">
            <Mic size={18} />
            <input type="file" accept="audio/*" className="hidden" onChange={(event) => onSelectAttachment(event.target.files?.[0] || null)} />
          </label>

          <textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder="Message"
            className="max-h-28 min-h-11 flex-1 resize-none rounded-3xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none transition focus:border-blush/70"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-r from-blush to-roseGold text-midnight transition hover:brightness-105 disabled:opacity-60"
            aria-label={sending ? 'Sending message' : 'Send message'}
          >
            <Send size={18} />
          </button>
        </div>
        <p className="mt-2 text-right text-[10px] text-pink-100/50">{draft.trim().length}/{CHAT_LIMITS.maxMessageLength}</p>
      </div>
    </section>
  );
}
