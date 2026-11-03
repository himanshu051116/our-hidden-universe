// Firebase Firestore documents have a 1 MiB limit. Keep this image much smaller.
export const MAX_SURPRISE_INPUT_BYTES = 12 * 1024 * 1024;
export const MAX_SURPRISE_JPEG_BYTES = 350 * 1024;
export const MAX_SURPRISE_DATA_LENGTH = 490_000;
export const SURPRISE_IMAGE_PREFIX = 'data:image/jpeg;base64,';

export function isValidSurpriseData(value) {
  return typeof value === 'string'
    && value.startsWith(SURPRISE_IMAGE_PREFIX)
    && value.length <= MAX_SURPRISE_DATA_LENGTH
    && /^[A-Za-z0-9+/]+={0,2}$/.test(value.slice(SURPRISE_IMAGE_PREFIX.length));
}

async function encodeJpeg(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('The browser could not prepare this photo.'));
      else resolve(blob);
    }, 'image/jpeg', quality);
  });
}

async function asDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('The photo could not be read.'));
    reader.readAsDataURL(blob);
  });
}

export async function optimizeSurpriseImage(file) {
  if (!file || !String(file.type || '').startsWith('image/')) {
    throw new Error('Choose a photo to keep inside your universe.');
  }
  if (file.size > MAX_SURPRISE_INPUT_BYTES) {
    throw new Error('Choose a photo smaller than 12 MB.');
  }
  if (typeof createImageBitmap !== 'function') {
    throw new Error('Your browser cannot securely prepare this image. Try an updated browser.');
  }
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    for (const longest of [1400, 1100, 850]) {
      const scale = Math.min(1, longest / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('The browser cannot process this image.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.8, 0.64, 0.48]) {
        const blob = await encodeJpeg(canvas, quality);
        if (blob.size > MAX_SURPRISE_JPEG_BYTES) continue;
        const data = await asDataUrl(blob);
        if (isValidSurpriseData(data)) return data;
      }
    }
  } finally {
    bitmap.close?.();
  }
  throw new Error('This photo is too detailed to store privately. Try a smaller photo.');
}
