// Conservative per-call video caps for users watching a movie while on a call.
// We never mute audio or request renegotiation just to reduce video bandwidth.
const SAVER_BITRATE = 450_000;
const SAVER_FPS = 15;
const baselineEncodings = new WeakMap();

export async function setCallVideoDataSaver(peer, enabled) {
  const sender = peer?.getSenders?.()?.find((item) =>
    item.track?.kind === 'video' && item.track.readyState !== 'ended');
  if (!sender?.getParameters || !sender?.setParameters) {
    throw new Error('Video quality controls are not supported on this device.');
  }

  const parameters = sender.getParameters();
  if (!parameters?.encodings?.length) {
    throw new Error('This browser cannot change video quality during a call.');
  }

  const previous = baselineEncodings.get(sender);
  // Capture the original negotiated sender encoding parameters only once,
  // before first applying the saver. Never discard existing network caps.
  if (!previous) {
    baselineEncodings.set(sender, parameters.encodings.map((encoding) => ({
      maxBitrate: encoding.maxBitrate,
      maxFramerate: encoding.maxFramerate,
      scaleResolutionDownBy: encoding.scaleResolutionDownBy,
    })));
  }
  const baseline = baselineEncodings.get(sender);
  const next = parameters.encodings.map((encoding, index) => {
    const original = baseline[index] || {};
    const revised = { ...encoding };

    if (enabled) {
      revised.maxBitrate = Math.min(Number(original.maxBitrate) || SAVER_BITRATE, SAVER_BITRATE);
      revised.maxFramerate = Math.min(Number(original.maxFramerate) || SAVER_FPS, SAVER_FPS);
      revised.scaleResolutionDownBy = Math.max(Number(original.scaleResolutionDownBy) || 1, 1.5);
    } else {
      for (const key of ['maxBitrate', 'maxFramerate', 'scaleResolutionDownBy']) {
        if (original[key] === undefined) delete revised[key];
        else revised[key] = original[key];
      }
    }
    return revised;
  });

  // setParameters may reject unsupported encoder settings. The caller must
  // surface that failure and leave the visible mode unchanged.
  await sender.setParameters({ ...parameters, encodings: next });
  return true;
}
