import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  OHS_FIRESTORE_DATABASE_ID,
  resolveFirestoreDatabaseId,
  resolveAdminFirestoreDatabaseId,
} from '../src/services/firestoreDatabaseId.js';

const firebaseConfig = JSON.parse(readFileSync('firebase.json', 'utf8'));

test('Firebase deployment, browser, and server target the same existing named database', () => {
  assert.equal(OHS_FIRESTORE_DATABASE_ID, 'default');
  assert.equal(firebaseConfig.firestore.database, OHS_FIRESTORE_DATABASE_ID);
  assert.equal(resolveFirestoreDatabaseId(undefined), OHS_FIRESTORE_DATABASE_ID);
  assert.equal(resolveAdminFirestoreDatabaseId({}), OHS_FIRESTORE_DATABASE_ID);
  assert.equal(resolveAdminFirestoreDatabaseId({ FIRESTORE_DATABASE_ID: 'default' }), OHS_FIRESTORE_DATABASE_ID);
  assert.equal(resolveAdminFirestoreDatabaseId({ VITE_FIRESTORE_DATABASE_ID: 'default' }), OHS_FIRESTORE_DATABASE_ID);
});

test('an explicit browser database setting is mirrored by the admin helper', () => {
  assert.equal(resolveFirestoreDatabaseId(' another-room-db '), 'another-room-db');
  assert.equal(resolveAdminFirestoreDatabaseId({ VITE_FIRESTORE_DATABASE_ID: 'another-room-db' }), 'another-room-db');
  assert.equal(resolveAdminFirestoreDatabaseId({
    VITE_FIRESTORE_DATABASE_ID: 'another-room-db',
    FIRESTORE_DATABASE_ID: 'another-room-db',
  }), 'another-room-db');
});

test('an inconsistent server database override fails closed', () => {
  assert.throws(
    () => resolveAdminFirestoreDatabaseId({ FIRESTORE_DATABASE_ID: '(default)' }),
    /disagree/,
  );
  assert.throws(
    () => resolveAdminFirestoreDatabaseId({
      VITE_FIRESTORE_DATABASE_ID: 'default',
      FIRESTORE_DATABASE_ID: '(default)',
    }),
    /disagree/,
  );
});

test('the real client and Admin integration both use the shared resolver', () => {
  const client = readFileSync('src/services/firebaseCore.js', 'utf8');
  const server = readFileSync('api/_firebaseAdmin.js', 'utf8');
  assert.match(client, /getFirestore\(app, firestoreDatabaseId\)/);
  assert.match(client, /resolveFirestoreDatabaseId\(import\.meta\.env\.VITE_FIRESTORE_DATABASE_ID\)/);
  assert.match(server, /getFirestore\(app, resolveAdminFirestoreDatabaseId\(process\.env\)\)/);
});
