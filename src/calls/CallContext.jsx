import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext.jsx';
import { subscribeCoupleMembers } from '../services/coupleDashboardService.js';
import {
  addIceCandidateRecord,
  cleanupCallSignaling,
  createCallRecord,
  fetchCall,
  markCallMissed,
  requestIceRestart,
  subscribeToCall,
  subscribeToIceCandidates,
  subscribeToIncomingCalls,
  updateCallStatus,
  writeAnswer,
  writeOffer,
  writeRestartAnswer,
  writeRestartOffer,
} from '../services/callSignalingService.js';
import { recordCallHistory } from '../services/callHistoryService.js';
import { sampleCallDiagnostics } from '../services/callDiagnosticsService.js';
import {
  enableCallNotifications as enableCallNotificationsService,
  refreshCallNotificationRegistration,
  sendIncomingCallPush,
} from '../services/callNotificationService.js';
import {
  acquireLocalMedia,
  setTrackEnabled,
  stopMediaStream,
  switchCamera,
} from '../services/mediaService.js';
import { resolveIceServers } from '../services/turnService.js';
import {
  applyRemoteDescription,
  attachLocalTracks,
  closePeerConnection,
  createAndSetAnswer,
  createAndSetOffer,
  createPeerConnection,
  safelyAddIceCandidate,
} from '../services/webrtcService.js';
import { CALL_STATUS, initialCallState } from './callState.js';

const CallContext = createContext(null);

const MAX_RESTART_ATTEMPTS = 2;
const RECONNECT_DELAY_MS = 2500;
const RING_TIMEOUT_MS = 30_000;

function millis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  if (typeof value === 'number') return value;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function CallProvider({ children }) {
  const { user, coupleId } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState(initialCallState);
  const [notificationStatus, setNotificationStatus] = useState({
    enabled: false,
    status: 'unknown',
    platform: 'unknown',
  });
  const [incomingCall, setIncomingCall] = useState(null);
  const [members, setMembers] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const stateRef = useRef(initialCallState);
  const activeCallRef = useRef(null);
  const membersRef = useRef([]);
  const peerRef = useRef(null);
  const roleRef = useRef(null);

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  const callUnsubRef = useRef(null);
  const remoteIceUnsubRef = useRef(null);

  const pendingCandidatesByRevisionRef = useRef(new Map());
  const currentRevisionRef = useRef(0);

  const processedInitialAnswerRef = useRef(false);
  const processedRestartOfferRef = useRef(0);
  const processedRestartAnswerRef = useRef(0);
  const restartInFlightRef = useRef(false);

  const reconnectTimerRef = useRef(null);
  const ringTimerRef = useRef(null);
  const finishLockRef = useRef(false);
  const diagnosticsTimerRef = useRef(null);
  const diagnosticsPreviousRef = useRef(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    remoteStreamRef.current = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  useEffect(() => {
    if (!user?.uid || !coupleId) return undefined;
    return subscribeCoupleMembers(coupleId, setMembers);
  }, [user?.uid, coupleId]);


  useEffect(() => {
    if (!user?.uid || !coupleId) return undefined;

    refreshCallNotificationRegistration(coupleId, user)
      .then(setNotificationStatus)
      .catch(() => {});

    const onNotificationOpen = (event) => {
      const data = event.detail || {};
      if (data.type !== 'incoming_call') return;
      if (data.coupleId && data.coupleId !== coupleId) return;
      navigate(`/universe/chat?callId=${encodeURIComponent(data.callId || '')}`);
    };

    window.addEventListener('ohu:call-notification-open', onNotificationOpen);
    return () => window.removeEventListener('ohu:call-notification-open', onNotificationOpen);
  }, [user?.uid, coupleId, navigate]);


  useEffect(() => {
    if (!user?.uid || !coupleId) return undefined;

    return subscribeToIncomingCalls(
      coupleId,
      user.uid,
      (call) => {
        if (!call) {
          if (stateRef.current.status === CALL_STATUS.INCOMING_RINGING) {
            setIncomingCall(null);
            setState(initialCallState);
          }
          return;
        }

        const current = stateRef.current.status;
        if (current !== CALL_STATUS.IDLE && current !== CALL_STATUS.INCOMING_RINGING) return;

        const roomMembers = membersRef.current;
        if (roomMembers.length !== 2) return;
        if (!roomMembers.some((member) => member.id === call.callerId)) return;

        activeCallRef.current = call;
        setIncomingCall(call);
        setState((previous) => ({
          ...previous,
          status: CALL_STATUS.INCOMING_RINGING,
          callId: call.id,
          type: call.type || 'video',
          callerId: call.callerId,
          calleeId: call.calleeId,
          error: '',
          warning: '',
        }));
      },
      () => {},
    );
  }, [user?.uid, coupleId]);

  useEffect(
    () => () => {
      clearTimeout(reconnectTimerRef.current);
      clearTimeout(ringTimerRef.current);
      clearInterval(diagnosticsTimerRef.current);
      callUnsubRef.current?.();
      remoteIceUnsubRef.current?.();
      closePeerConnection(peerRef.current);
      stopMediaStream(localStreamRef.current);
      stopMediaStream(remoteStreamRef.current);
    },
    [],
  );

  const partner = useMemo(
    () => (
      members.length === 2
        ? members.find((member) => member.id !== user?.uid) || null
        : null
    ),
    [members, user?.uid],
  );

  function queueCandidate(record) {
    const revision = Number(record?.revision || 0);
    const map = pendingCandidatesByRevisionRef.current;
    const existing = map.get(revision) || [];
    existing.push(record);
    map.set(revision, existing);
  }

  async function flushRemoteCandidates(revision = currentRevisionRef.current) {
    if (!peerRef.current?.remoteDescription) return;

    const map = pendingCandidatesByRevisionRef.current;
    const pending = map.get(revision) || [];
    map.delete(revision);

    for (const record of pending) {
      try {
        const { revision: _revision, ...candidate } = record;
        await safelyAddIceCandidate(peerRef.current, candidate);
      } catch {
        // Connectivity-state handling will surface a real failure if needed.
      }
    }
  }

  async function handleRemoteCandidate(record) {
    if (!peerRef.current) return;

    const revision = Number(record?.revision || 0);
    if (
      revision !== currentRevisionRef.current
      || !peerRef.current.remoteDescription
    ) {
      queueCandidate(record);
      return;
    }

    const { revision: _revision, ...candidate } = record;
    await safelyAddIceCandidate(peerRef.current, candidate);
  }

  function observeRemoteCandidates(callId, remoteSide) {
    remoteIceUnsubRef.current?.();
    remoteIceUnsubRef.current = subscribeToIceCandidates(
      coupleId,
      callId,
      remoteSide,
      (candidate) => handleRemoteCandidate(candidate).catch(() => {}),
      () => {},
    );
  }

  async function recordHistory(call, result) {
    if (!call?.id) return;

    const connectedAt = call.connectedAt || stateRef.current.connectedAt;
    const connectedMs = millis(connectedAt);
    const durationSeconds = connectedMs
      ? Math.max(0, Math.round((Date.now() - connectedMs) / 1000))
      : 0;

    await recordCallHistory({
      coupleId,
      callId: call.id,
      callerId: call.callerId,
      calleeId: call.calleeId,
      type: call.type,
      result,
      startedAt: call.createdAt || stateRef.current.startedAt,
      connectedAt,
      durationSeconds,
    }).catch(() => {});
  }

  async function finishLocal(message = '', preserveEnded = true) {
    if (finishLockRef.current) return;
    finishLockRef.current = true;

    clearTimeout(reconnectTimerRef.current);
    clearTimeout(ringTimerRef.current);
    clearInterval(diagnosticsTimerRef.current);
    diagnosticsTimerRef.current = null;
    diagnosticsPreviousRef.current = null;

    callUnsubRef.current?.();
    remoteIceUnsubRef.current?.();
    callUnsubRef.current = null;
    remoteIceUnsubRef.current = null;

    closePeerConnection(peerRef.current);
    peerRef.current = null;
    roleRef.current = null;

    stopMediaStream(localStreamRef.current);
    stopMediaStream(remoteStreamRef.current);

    localStreamRef.current = null;
    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setIncomingCall(null);

    pendingCandidatesByRevisionRef.current = new Map();
    currentRevisionRef.current = 0;
    restartInFlightRef.current = false;
    processedInitialAnswerRef.current = false;
    processedRestartOfferRef.current = 0;
    processedRestartAnswerRef.current = 0;
    activeCallRef.current = null;

    const next = {
      ...initialCallState,
      status: preserveEnded ? CALL_STATUS.ENDED : CALL_STATUS.IDLE,
      error: message,
      endedAt: Date.now(),
    };

    stateRef.current = next;
    setState(next);
    finishLockRef.current = false;

    if (preserveEnded) {
      window.setTimeout(() => {
        setState((current) => {
          if (current.status !== CALL_STATUS.ENDED) return current;
          stateRef.current = initialCallState;
          return initialCallState;
        });
      }, 1400);
    }
  }

  async function failActiveCall(reason = 'network-failed', message = 'The call connection failed.') {
    const call = activeCallRef.current;
    if (call?.id) {
      await updateCallStatus(coupleId, call.id, 'failed', {
        endedAt: serverTimestamp(),
        endedBy: user?.uid || null,
        endReason: reason,
      }).catch(() => {});
      await recordHistory(call, 'failed');
      cleanupCallSignaling(coupleId, call.id).catch(() => {});
    }

    await finishLocal(message, true);
  }

  async function performCallerIceRestart() {
    const peer = peerRef.current;
    const call = activeCallRef.current;

    if (!peer || !call?.id || roleRef.current !== 'caller') return;
    if (restartInFlightRef.current) return;

    const attempts = stateRef.current.reconnectAttempts + 1;
    if (attempts > MAX_RESTART_ATTEMPTS) {
      await failActiveCall('ice-restart-exhausted', 'Unable to restore the call connection.');
      return;
    }

    restartInFlightRef.current = true;
    const revision = Date.now();
    currentRevisionRef.current = revision;
    pendingCandidatesByRevisionRef.current.delete(revision);

    setState((previous) => ({
      ...previous,
      status: CALL_STATUS.RECONNECTING,
      reconnectAttempts: attempts,
      error: '',
    }));

    try {
      peer.restartIce?.();
      const offer = await createAndSetOffer(peer, { iceRestart: true });
      await writeRestartOffer(coupleId, call.id, revision, offer);
      processedRestartAnswerRef.current = 0;
    } catch {
      restartInFlightRef.current = false;
      if (attempts >= MAX_RESTART_ATTEMPTS) {
        await failActiveCall('ice-restart-failed', 'Unable to restore the call connection.');
      }
    }
  }

  async function requestRecovery() {
    const call = activeCallRef.current;
    if (!call?.id || !user?.uid) return;

    if (roleRef.current === 'caller') {
      await performCallerIceRestart();
      return;
    }

    const attempts = stateRef.current.reconnectAttempts + 1;
    if (attempts > MAX_RESTART_ATTEMPTS) {
      await failActiveCall('ice-restart-exhausted', 'Unable to restore the call connection.');
      return;
    }

    setState((previous) => ({
      ...previous,
      status: CALL_STATUS.RECONNECTING,
      reconnectAttempts: attempts,
    }));

    await requestIceRestart(coupleId, call.id, user.uid).catch(() => {});
  }

  function scheduleRecovery() {
    if (!peerRef.current || !activeCallRef.current?.id) return;

    setState((previous) => ({
      ...previous,
      status: CALL_STATUS.RECONNECTING,
    }));

    clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = window.setTimeout(() => {
      const connectionState = peerRef.current?.connectionState;
      if (connectionState === 'connected') return;
      requestRecovery().catch(() => {});
    }, RECONNECT_DELAY_MS);
  }


  function startDiagnostics(peer) {
    clearInterval(diagnosticsTimerRef.current);
    diagnosticsPreviousRef.current = null;

    async function sample() {
      if (!peer || peer.connectionState === 'closed') return;

      try {
        const result = await sampleCallDiagnostics(
          peer,
          diagnosticsPreviousRef.current,
        );
        diagnosticsPreviousRef.current = result;

        if (!result.sample) return;

        setState((previous) => ({
          ...previous,
          connectionRoute:
            result.sample.route !== 'unknown'
              ? result.sample.route
              : previous.connectionRoute,
          diagnostics: {
            ...previous.diagnostics,
            ...result.sample,
          },
        }));
      } catch {
        // Diagnostics must never interrupt an active call.
      }
    }

    sample();
    diagnosticsTimerRef.current = window.setInterval(sample, 2500);
  }

  function createConnection(callId, localSide, iceServers) {
    roleRef.current = localSide;
    currentRevisionRef.current = 0;
    pendingCandidatesByRevisionRef.current = new Map();
    processedInitialAnswerRef.current = false;
    processedRestartOfferRef.current = 0;
    processedRestartAnswerRef.current = 0;
    restartInFlightRef.current = false;

    const peer = createPeerConnection({
      iceServers,
      onIceCandidate: (candidate) =>
        addIceCandidateRecord(
          coupleId,
          callId,
          localSide,
          candidate,
          currentRevisionRef.current,
        ).catch(() => {}),
      onTrack: (stream) => {
        remoteStreamRef.current = stream;
        setRemoteStream(stream);
      },
      onConnectionStateChange: (connectionState) => {
        if (connectionState === 'connected') {
          clearTimeout(reconnectTimerRef.current);
          clearTimeout(ringTimerRef.current);
          restartInFlightRef.current = false;

          const firstConnection = !stateRef.current.connectedAt;

          setState((previous) => ({
            ...previous,
            status: CALL_STATUS.CONNECTED,
            connectedAt: previous.connectedAt || Date.now(),
            error: '',
            reconnectAttempts: 0,
          }));

          const connectedPatch = {
            restartRequestedBy: null,
          };
          if (firstConnection) connectedPatch.connectedAt = serverTimestamp();

          updateCallStatus(coupleId, callId, 'connected', connectedPatch).catch(() => {});

          startDiagnostics(peerRef.current);
          return;
        }

        if (connectionState === 'disconnected' || connectionState === 'failed') {
          scheduleRecovery();
        }
      },
      onIceConnectionStateChange: (iceState) => {
        if (iceState === 'failed') scheduleRecovery();
      },
    });

    peerRef.current = peer;
    return peer;
  }

  async function handleRestartOffer(call) {
    const revision = Number(call.restartRevision || 0);
    if (!call.restartOffer || !revision || revision <= processedRestartOfferRef.current) return;
    if (roleRef.current !== 'callee') return;

    processedRestartOfferRef.current = revision;
    currentRevisionRef.current = revision;
    restartInFlightRef.current = true;

    try {
      await applyRemoteDescription(peerRef.current, call.restartOffer);
      await flushRemoteCandidates(revision);
      const answer = await createAndSetAnswer(peerRef.current);
      await writeRestartAnswer(coupleId, call.id, revision, answer);
      setState((previous) => ({ ...previous, status: CALL_STATUS.CONNECTING }));
    } catch {
      restartInFlightRef.current = false;
      await failActiveCall('restart-answer-failed', 'Unable to recover the call connection.');
    }
  }

  async function handleRestartAnswer(call) {
    const revision = Number(call.restartRevision || 0);
    if (!call.restartAnswer || !revision || revision <= processedRestartAnswerRef.current) return;
    if (roleRef.current !== 'caller') return;

    processedRestartAnswerRef.current = revision;

    try {
      await applyRemoteDescription(peerRef.current, call.restartAnswer);
      await flushRemoteCandidates(revision);
      restartInFlightRef.current = false;
      setState((previous) => ({ ...previous, status: CALL_STATUS.CONNECTING }));
    } catch {
      restartInFlightRef.current = false;
      await failActiveCall('restart-apply-failed', 'Unable to restore the call connection.');
    }
  }

  function observeCall(callId, role) {
    callUnsubRef.current?.();

    callUnsubRef.current = subscribeToCall(
      coupleId,
      callId,
      async (call) => {
        if (!call) return;
        activeCallRef.current = call;

        if (call.status === 'declined') {
          await recordHistory(call, 'declined');
          await finishLocal('Call declined.', true);
          return;
        }

        if (call.status === 'missed') {
          await recordHistory(call, 'missed');
          await finishLocal('No answer.', true);
          return;
        }

        if (call.status === 'ended') {
          await recordHistory(call, call.connectedAt ? 'completed' : 'cancelled');
          await finishLocal('', true);
          return;
        }

        if (call.status === 'failed') {
          await recordHistory(call, 'failed');
          await finishLocal('Call failed.', true);
          return;
        }

        if (role === 'caller' && call.answer && !processedInitialAnswerRef.current) {
          processedInitialAnswerRef.current = true;
          clearTimeout(ringTimerRef.current);

          try {
            await applyRemoteDescription(peerRef.current, call.answer);
            await flushRemoteCandidates(0);
            setState((previous) => ({ ...previous, status: CALL_STATUS.CONNECTING }));
          } catch {
            await failActiveCall('answer-apply-failed', 'Unable to complete call setup.');
            return;
          }
        }

        if (
          role === 'caller'
          && call.restartRequestedBy
          && call.status === 'reconnecting'
          && !restartInFlightRef.current
        ) {
          await performCallerIceRestart();
        }

        if (role === 'callee') {
          await handleRestartOffer(call);
        } else {
          await handleRestartAnswer(call);
        }
      },
      () => {},
    );
  }

  async function handleRingTimeout(callId) {
    try {
      const call = await fetchCall(coupleId, callId);
      if (!call || call.status !== 'ringing') return;

      await markCallMissed(coupleId, callId, user.uid);
      await recordHistory(call, 'missed');
      cleanupCallSignaling(coupleId, callId).catch(() => {});
      await finishLocal('No answer.', true);
    } catch {
      // The call snapshot listener remains the source of truth.
    }
  }

  async function startCall(type = 'video') {
    if (!user?.uid || !coupleId) throw new Error('Sign in to start a call.');
    if (membersRef.current.length !== 2) {
      throw new Error('Private calling requires exactly two members in this couple room.');
    }
    if (!partner?.id) throw new Error('Your partner has not joined this room yet.');

    const current = stateRef.current.status;
    if (current !== CALL_STATUS.IDLE && current !== CALL_STATUS.ENDED) {
      throw new Error('Another call is already active.');
    }

    setState({
      ...initialCallState,
      status: CALL_STATUS.REQUESTING_MEDIA,
      type,
      callerId: user.uid,
      calleeId: partner.id,
    });

    let createdCallId = null;

    try {
      const [stream, iceConfig] = await Promise.all([
        acquireLocalMedia(type),
        resolveIceServers(coupleId),
      ]);

      localStreamRef.current = stream;
      setLocalStream(stream);

      setState((previous) => ({
        ...previous,
        status: CALL_STATUS.CREATING,
        relayAvailable: iceConfig.relayAvailable,
        warning: iceConfig.warning,
      }));

      const callId = await createCallRecord({
        coupleId,
        callerId: user.uid,
        calleeId: partner.id,
        type,
      });
      createdCallId = callId;

      const baseCall = {
        id: callId,
        callerId: user.uid,
        calleeId: partner.id,
        type,
        status: 'creating',
        createdAt: Date.now(),
      };
      activeCallRef.current = baseCall;

      const peer = createConnection(callId, 'caller', iceConfig.iceServers);
      attachLocalTracks(peer, stream);

      observeRemoteCandidates(callId, 'callee');
      observeCall(callId, 'caller');

      const offer = await createAndSetOffer(peer);
      await writeOffer(coupleId, callId, offer);

      sendIncomingCallPush(coupleId, callId).catch(() => {});

      const nextStartedAt = Date.now();
      setState((previous) => ({
        ...previous,
        callId,
        status: CALL_STATUS.OUTGOING_RINGING,
        startedAt: nextStartedAt,
      }));

      clearTimeout(ringTimerRef.current);
      ringTimerRef.current = window.setTimeout(
        () => handleRingTimeout(callId),
        RING_TIMEOUT_MS,
      );
    } catch (error) {
      if (createdCallId) {
        updateCallStatus(coupleId, createdCallId, 'failed', {
          endedAt: serverTimestamp(),
          endedBy: user.uid,
          endReason: 'setup-failed',
        }).catch(() => {});
        cleanupCallSignaling(coupleId, createdCallId).catch(() => {});
      }

      stopMediaStream(localStreamRef.current);
      localStreamRef.current = null;
      setLocalStream(null);
      closePeerConnection(peerRef.current);
      peerRef.current = null;

      setState((previous) => ({
        ...previous,
        status: CALL_STATUS.FAILED,
        error: error?.message || 'Unable to start the call.',
      }));
      throw error;
    }
  }

  async function answerCall() {
    const call = incomingCall;
    if (!call?.id) return;

    if (call.expiresAt && millis(call.expiresAt) <= Date.now()) {
      setIncomingCall(null);
      setState(initialCallState);
      return;
    }

    setState((previous) => ({
      ...previous,
      status: CALL_STATUS.REQUESTING_MEDIA,
      error: '',
    }));

    try {
      const [stream, iceConfig] = await Promise.all([
        acquireLocalMedia(call.type || 'video'),
        resolveIceServers(coupleId),
      ]);

      localStreamRef.current = stream;
      setLocalStream(stream);
      activeCallRef.current = call;

      setState((previous) => ({
        ...previous,
        relayAvailable: iceConfig.relayAvailable,
        warning: iceConfig.warning,
      }));

      const peer = createConnection(call.id, 'callee', iceConfig.iceServers);
      attachLocalTracks(peer, stream);

      observeRemoteCandidates(call.id, 'caller');
      observeCall(call.id, 'callee');

      await applyRemoteDescription(peer, call.offer);
      await flushRemoteCandidates(0);

      const answer = await createAndSetAnswer(peer);
      await writeAnswer(coupleId, call.id, answer);

      setState((previous) => ({
        ...previous,
        status: CALL_STATUS.CONNECTING,
        startedAt: millis(call.createdAt) || Date.now(),
      }));
      setIncomingCall(null);
    } catch (error) {
      setState((previous) => ({
        ...previous,
        status: CALL_STATUS.FAILED,
        error: error?.message || 'Unable to answer the call.',
      }));
    }
  }

  async function declineCall() {
    const call = incomingCall;
    if (!call?.id) return;

    await updateCallStatus(coupleId, call.id, 'declined', {
      endedAt: serverTimestamp(),
      endedBy: user.uid,
      endReason: 'declined',
    }).catch(() => {});

    await recordHistory(call, 'declined');
    cleanupCallSignaling(coupleId, call.id).catch(() => {});
    await finishLocal('', false);
  }

  async function endCall(reason = 'user-ended') {
    const call = activeCallRef.current;

    if (call?.id) {
      await updateCallStatus(coupleId, call.id, 'ended', {
        endedAt: serverTimestamp(),
        endedBy: user?.uid || null,
        endReason: reason,
      }).catch(() => {});

      await recordHistory(
        call,
        stateRef.current.connectedAt || call.connectedAt ? 'completed' : 'cancelled',
      );

      cleanupCallSignaling(coupleId, call.id).catch(() => {});
    }

    await finishLocal('', true);
  }

  function toggleMute() {
    const stream = localStreamRef.current;
    setState((previous) => {
      const muted = !previous.muted;
      setTrackEnabled(stream, 'audio', !muted);
      return { ...previous, muted };
    });
  }

  function toggleCamera() {
    const stream = localStreamRef.current;
    setState((previous) => {
      const cameraEnabled = !previous.cameraEnabled;
      setTrackEnabled(stream, 'video', cameraEnabled);
      return { ...previous, cameraEnabled };
    });
  }

  async function flipCamera() {
    if (!localStreamRef.current || !peerRef.current) return;

    const result = await switchCamera(
      localStreamRef.current,
      peerRef.current,
      stateRef.current.facingMode,
    );

    localStreamRef.current = result.stream;
    setLocalStream(result.stream);
    setState((previous) => ({
      ...previous,
      facingMode: result.facingMode,
    }));
  }


  async function enableCallNotifications() {
    const result = await enableCallNotificationsService(coupleId, user);
    setNotificationStatus(result);
    return result;
  }

  const value = useMemo(
    () => ({
      call: state,
      incomingCall,
      partner,
      roomMemberCount: members.length,
      localStream,
      remoteStream,
      startCall,
      answerCall,
      declineCall,
      endCall,
      toggleMute,
      toggleCamera,
      flipCamera,
      notificationStatus,
      enableCallNotifications,
    }),
    [state, incomingCall, partner, members.length, localStream, remoteStream, notificationStatus],
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used inside CallProvider.');
  return context;
}
