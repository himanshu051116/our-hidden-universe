import CallScreen from '../components/call/CallScreen.jsx';
import IncomingCallModal from '../components/call/IncomingCallModal.jsx';

export default function CallOverlay() {
  return (
    <>
      <IncomingCallModal />
      <CallScreen />
    </>
  );
}
