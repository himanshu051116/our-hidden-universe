// One canonical signaling path for both the Firebase client and server push API.
// Keep this compatible with deployed Firestore rules until a coordinated migration.
export const callCollectionPath = (coupleId) => `couples/${coupleId}/watchParty`;
export const callDocumentPath = (coupleId, callId) => `${callCollectionPath(coupleId)}/${callId}`;
