import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

// Public landing works without loading Firebase/Auth/WebRTC code.
const guest = Object.freeze({
  user: null,
  loading: false,
  coupleId: 'demo-room',
  coupleCode: '',
  coupleCodeDisplay: '',
  sharedSecret: '',
});

export function GuestAuthProvider({ children }) {
  return <AuthContext.Provider value={guest}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
