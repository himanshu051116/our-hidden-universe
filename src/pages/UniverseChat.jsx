import { useOutletContext } from 'react-router-dom';
import ChatPanel from '../components/ChatPanel.jsx';
import CallDiagnosticsPanel from '../components/call/CallDiagnosticsPanel.jsx';
import CallHistoryPanel from '../components/call/CallHistoryPanel.jsx';
import CallLaunchButtons from '../components/call/CallLaunchButtons.jsx';

export default function UniverseChat() {
  const { setMessageCount, resetVersion } = useOutletContext();

  return (
    <>
      <CallLaunchButtons />
      <CallDiagnosticsPanel />
      <CallHistoryPanel />
      <ChatPanel key={`chat-${resetVersion}`} onMessageCountChange={setMessageCount} />
    </>
  );
}
