import { getStorage } from 'firebase/storage';
import { app } from './firebaseCore.js';

export { app, auth, db, firebaseEnabled } from './firebaseCore.js';
export const storage = app ? getStorage(app) : null;
