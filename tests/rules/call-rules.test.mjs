import fs from 'node:fs';
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';

import {
  Timestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

const PROJECT_ID = 'demo-ohu-call-rules';
const ROOM = 'ABCD1234EFGH';
const A = 'user-a';
const B = 'user-b';
const C = 'user-c';

let env;

function authDb(uid) {
  return env.authenticatedContext(uid, {
    email: `${uid}@example.test`,
  }).firestore();
}

async function createTwoMemberRoom() {
  const dbA = authDb(A);

  const createBatch = writeBatch(dbA);
  createBatch.set(doc(dbA, 'couples', ROOM), {
    code: ROOM,
    displayCode: 'ABCD-1234-EFGH',
    createdBy: A,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    memberIds: [A],
    memberCount: 1,
  });
  createBatch.set(doc(dbA, 'couples', ROOM, 'members', A), {
    joinedAt: Timestamp.now(),
    role: 'creator',
    lastActiveAt: Timestamp.now(),
    displayName: 'A',
  });
  await assertSucceeds(createBatch.commit());

  const dbB = authDb(B);
  const joinBatch = writeBatch(dbB);
  joinBatch.update(doc(dbB, 'couples', ROOM), {
    memberIds: [A, B],
    memberCount: 2,
    updatedAt: Timestamp.now(),
  });
  joinBatch.set(doc(dbB, 'couples', ROOM, 'members', B), {
    joinedAt: Timestamp.now(),
    role: 'partner',
    lastActiveAt: Timestamp.now(),
    displayName: 'B',
  });
  await assertSucceeds(joinBatch.commit());
}

function callDocument() {
  return {
    callerId: A,
    calleeId: B,
    type: 'video',
    status: 'creating',
    offer: null,
    answer: null,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + 30_000),
    answeredAt: null,
    connectedAt: null,
    endedAt: null,
    endedBy: null,
    endReason: null,
    restartRevision: 0,
    restartRequestedBy: null,
    restartOffer: null,
    restartAnswer: null,
    restartStartedAt: null,
  };
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });
});

after(async () => {
  await env.cleanup();
});

test('creator can atomically create room + creator membership', async () => {
  await env.clearFirestore();

  const dbA = authDb(A);
  const batch = writeBatch(dbA);

  batch.set(doc(dbA, 'couples', ROOM), {
    code: ROOM,
    displayCode: 'ABCD-1234-EFGH',
    createdBy: A,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    memberIds: [A],
    memberCount: 1,
  });

  batch.set(doc(dbA, 'couples', ROOM, 'members', A), {
    joinedAt: Timestamp.now(),
    role: 'creator',
    lastActiveAt: Timestamp.now(),
    displayName: 'A',
  });

  await assertSucceeds(batch.commit());
});

test('second member may join but a third member may not claim the room', async () => {
  await env.clearFirestore();
  await createTwoMemberRoom();

  const dbC = authDb(C);

  await assertFails(
    updateDoc(doc(dbC, 'couples', ROOM), {
      memberIds: [A, B, C],
      memberCount: 3,
      updatedAt: Timestamp.now(),
    }),
  );

  await assertFails(
    setDoc(doc(dbC, 'couples', ROOM, 'members', C), {
      joinedAt: Timestamp.now(),
      role: 'partner',
      lastActiveAt: Timestamp.now(),
      displayName: 'C',
    }),
  );
});

test('non-member cannot read a completed two-person room document', async () => {
  await env.clearFirestore();
  await createTwoMemberRoom();

  const dbC = authDb(C);
  await assertFails(getDoc(doc(dbC, 'couples', ROOM)));
});

test('member cannot change immutable membership role', async () => {
  await env.clearFirestore();
  await createTwoMemberRoom();

  const dbB = authDb(B);
  await assertFails(
    updateDoc(doc(dbB, 'couples', ROOM, 'members', B), {
      role: 'creator',
    }),
  );
});

test('caller and callee get separate signaling authority', async () => {
  await env.clearFirestore();
  await createTwoMemberRoom();

  const dbA = authDb(A);
  const dbB = authDb(B);

  const callA = doc(dbA, 'couples', ROOM, 'calls', 'call-1');
  await assertSucceeds(setDoc(callA, callDocument()));

  await assertSucceeds(
    updateDoc(callA, {
      status: 'ringing',
      offer: { type: 'offer', sdp: 'fake-offer-sdp' },
    }),
  );

  await assertFails(
    updateDoc(callA, {
      status: 'connecting',
      answer: { type: 'answer', sdp: 'caller-must-not-write-this' },
      answeredAt: Timestamp.now(),
      expiresAt: null,
    }),
  );

  const callB = doc(dbB, 'couples', ROOM, 'calls', 'call-1');
  await assertSucceeds(
    updateDoc(callB, {
      status: 'connecting',
      answer: { type: 'answer', sdp: 'fake-answer-sdp' },
      answeredAt: Timestamp.now(),
      expiresAt: null,
    }),
  );
});

test('caller ICE collection rejects callee writes', async () => {
  await env.clearFirestore();
  await createTwoMemberRoom();

  const dbA = authDb(A);
  const dbB = authDb(B);

  await assertSucceeds(
    setDoc(doc(dbA, 'couples', ROOM, 'calls', 'call-2'), callDocument()),
  );

  const candidate = {
    candidate: 'candidate:fake',
    sdpMid: '0',
    sdpMLineIndex: 0,
    usernameFragment: 'fake',
    revision: 0,
  };

  await assertSucceeds(
    setDoc(
      doc(dbA, 'couples', ROOM, 'calls', 'call-2', 'callerCandidates', 'a'),
      candidate,
    ),
  );

  await assertFails(
    setDoc(
      doc(dbB, 'couples', ROOM, 'calls', 'call-2', 'callerCandidates', 'b'),
      candidate,
    ),
  );
});

test('device registration can only be written by that member', async () => {
  await env.clearFirestore();
  await createTwoMemberRoom();

  const dbA = authDb(A);
  const dbB = authDb(B);

  const payload = {
    targetId: 'fid-this-is-a-test-installation-id',
    targetType: 'fid',
    platform: 'web',
    enabled: true,
    updatedAt: Timestamp.now(),
  };

  await assertSucceeds(
    setDoc(
      doc(dbA, 'couples', ROOM, 'members', A, 'devices', 'device-a'),
      payload,
    ),
  );

  await assertFails(
    setDoc(
      doc(dbB, 'couples', ROOM, 'members', A, 'devices', 'device-b'),
      payload,
    ),
  );
});
