import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidSurpriseData, MAX_SURPRISE_DATA_LENGTH,
  SURPRISE_IMAGE_PREFIX, MAX_SURPRISE_JPEG_BYTES,
} from '../src/services/privateSurpriseMedia.js';

test('private surprise accepts only bounded encoded JPEGs', () => {
  assert.equal(isValidSurpriseData('data:image/jpeg;base64,/9j/2Q=='), true);
  assert.equal(isValidSurpriseData('https://ohs.vercel.app/secret-sun-surprise.jpeg'), false);
  assert.equal(isValidSurpriseData('data:text/html;base64,PHNjcmlwdD4='), false);
  assert.equal(isValidSurpriseData('data:image/jpeg;base64,***'), false);
  assert.equal(isValidSurpriseData(null), false);
  assert.equal(isValidSurpriseData(SURPRISE_IMAGE_PREFIX + 'A'.repeat(MAX_SURPRISE_DATA_LENGTH)), false);
  assert.ok(MAX_SURPRISE_JPEG_BYTES < 1024 * 1024 / 2);
});
