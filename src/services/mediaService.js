export const DEFAULT_MEDIA_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: {
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 24, max: 30 },
  },
};

export async function acquireLocalMedia(type = 'video') {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera and microphone access are not supported in this browser.');
  }

  const constraints =
    type === 'audio'
      ? {
          audio: DEFAULT_MEDIA_CONSTRAINTS.audio,
          video: false,
        }
      : DEFAULT_MEDIA_CONSTRAINTS;

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
      throw new Error('Camera or microphone permission was denied.');
    }
    if (error?.name === 'NotFoundError') {
      throw new Error('No compatible camera or microphone was found.');
    }
    if (error?.name === 'NotReadableError') {
      throw new Error('Your camera or microphone is busy in another app.');
    }
    if (error?.name === 'OverconstrainedError') {
      return navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? { facingMode: 'user' } : false,
      });
    }
    throw new Error(error?.message || 'Unable to open camera or microphone.');
  }
}

export function stopMediaStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop());
}

export function setTrackEnabled(stream, kind, enabled) {
  const tracks = kind === 'audio' ? stream?.getAudioTracks?.() : stream?.getVideoTracks?.();
  (tracks || []).forEach((track) => {
    track.enabled = enabled;
  });
}

export async function switchCamera(stream, peerConnection, currentFacingMode = 'user') {
  if (!stream) return { stream, facingMode: currentFacingMode };

  const nextFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
  const currentVideoTrack = stream.getVideoTracks()[0];

  const replacementStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: nextFacingMode } },
    audio: false,
  });
  const replacementTrack = replacementStream.getVideoTracks()[0];

  if (!replacementTrack) {
    stopMediaStream(replacementStream);
    throw new Error('Unable to switch camera.');
  }

  const sender = peerConnection
    ?.getSenders()
    ?.find((candidate) => candidate.track?.kind === 'video');

  if (sender) {
    await sender.replaceTrack(replacementTrack);
  }

  if (currentVideoTrack) {
    stream.removeTrack(currentVideoTrack);
    currentVideoTrack.stop();
  }
  stream.addTrack(replacementTrack);

  return { stream, facingMode: nextFacingMode };
}
