import { CallProvider } from './CallContext.jsx';
import CallOverlay from './CallOverlay.jsx';

// Loaded only for an authenticated account. The public first visit does not
// need WebRTC signaling, TURN diagnostics or call notification code.
export default function CallRuntime({ children }) {
  return (
    <CallProvider>
      {children}
      <CallOverlay />
    </CallProvider>
  );
}
